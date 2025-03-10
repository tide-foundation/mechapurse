import kcData from "../tidecloak.json";

export interface InitCertResponse {
    cert: string;
    sig: string;
}
const KEYCLOAK_AUTH_SERVER = kcData["auth-server-url"];
const REALM = kcData["realm"];

//http://localhost:8080/admin/realms/TideWallet/tideAdminResources/add-rules?roleId=09cda902-6870-4423-8661-eb870396df17
const TC_URL = `${KEYCLOAK_AUTH_SERVER}/admin/realms/${REALM}`


export const getRoleInitCert = async (roleId: string, token: string): Promise<InitCertResponse> => {

    const response = await fetch(`${TC_URL}/tideAdminResources/get-init-cert?roleId=${roleId}`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        }
    });


    return response.json()
}

export const getTideVendorKeyConfig = async (token: string): Promise<any> => {

    const response = await fetch(`${TC_URL}/components?name=tide-vendor-key`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        }
    });


    return response.json()
}

export const signMessage = async (message: string, token: string): Promise<string> => {

    const formData = new FormData();
    formData.append("data", message);

    const response = await fetch(`${TC_URL}/vendorResources/sign-message`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });


    return response.text()

}

//sign-tx
export const signTx = async (message: string, roleId: string, token: string): Promise<string> => {

    const formData = new FormData();
    formData.append("data", message);

    const response = await fetch(`${TC_URL}/vendorResources/sign-tx?roleId=${roleId}`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });


    return response.text()

}