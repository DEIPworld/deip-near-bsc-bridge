import { main, Direction } from './index'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import queue from 'express-queue'

import { FullFeeFromBSCToNear, FullFeeFromNearToBSC } from "./fee"
import { isStorageDeposited } from "./check_storage_deposit"

const app = express()
export let addresses = []

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
    preflightContinue: true,
}

app.use(cors(corsOptions), bodyParser.json())
const requestQueue = queue({ activeLimit: 4, queuedLimit: 2000, rejectHandler: (req, res) => { res.sendStatus(500); } })
app.post('/', requestQueue, async (request, response) => {
    try {
        if (!request.body) {
            response.statusCode = 400
            response.send("Error: body undefined")
        }
        let address = request.body.address
        let direction = request.body.direction
        if (!address || !direction) {
            response.statusCode = 400
            response.send("Error: address or direction undefined")
        }
        if (addresses.indexOf(address) == -1) {
            addresses.push(address)
            await main(Direction[direction as keyof typeof Direction], address)
            response.statusCode = 200
            response.send("Request sended")
            addresses.splice(addresses.indexOf(address))
        } else {
            response.statusCode = 200
            response.send("Request is already performing")
        }
    } catch (error) {
        console.log("Internal server error: ", error)
        response.statusCode = 500
        response.send("Internal server error")
    }
})

app.get('/fee', async (request, response) => {
    const BscToNear = await FullFeeFromBSCToNear()
    const NearToBsc = await FullFeeFromNearToBSC()

    response.statusCode = 200
    response.send({
        feeBSCToNear: BscToNear.toString(),
        feeNearToBSC: NearToBsc.toString()
    })
})

app.post('/acccount', async (request, response) => {
    if (!request.body) {
        response.statusCode = 400
        response.send("Error: body undefined")
    }
    let address = request.body.address
    const isDeposited = await isStorageDeposited(address)
    console.log(isDeposited)
    response.statusCode = 200
    response.send({
        isDeposited
    })
})

app.get('/ping', async (request, response) => {
    response.send("running")
})

app.listen(7777, () => {
    console.log('Node server running on port 7777')
})
