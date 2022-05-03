export async function safe(promise: Promise<any>) {
    try {
        return [await promise, null]
    } catch (error) {
        return [null, error]
    }
}

export function validateBscAddress(bscAddress: string): boolean {
    // TODO
    if (bscAddress.length > 42 || bscAddress.length < 40) {
        return false
    }
    return true
}

export function validateNearAddress(nearAddress: string): boolean {
    // TODO
    if (nearAddress.match("[^A-Za-z0-9_\\-\\.]") != null) {
        return false
    }
    if (!(nearAddress.match(".*(\\.testnet)") != null || nearAddress.match(".*(\\.near)") != null)) {
        return false
    }

    return true
}
