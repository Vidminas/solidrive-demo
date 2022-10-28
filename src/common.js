import { createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';
import $ from "jquery";
import { Buffer } from "buffer";

export const SOLID_IDENTITY_PROVIDER = "https://solidpod.azurewebsites.net";
export const EMAIL_ALICE = "alice@localhost"
export const PASSWORD_ALICE = "Wonderland"
export const POD_ALICE = `${SOLID_IDENTITY_PROVIDER}/Alice-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_ALICE = `Profile: ${POD_ALICE}\nEmail: ${EMAIL_ALICE}\nPassword: ${PASSWORD_ALICE}`;
export const EMAIL_BOB = "bob@localhost"
export const PASSWORD_BOB = "AfraidOfNothing"
export const POD_BOB = `${SOLID_IDENTITY_PROVIDER}/Bob-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_BOB = `Profile: ${POD_BOB}\nEmail: ${EMAIL_BOB}\nPassword: ${PASSWORD_BOB}`;
export const EMAIL_EVE = "eve@localhost"
export const PASSWORD_EVE = "HavingFun"
export const POD_EVE = `${SOLID_IDENTITY_PROVIDER}/Eve-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_EVE = `Profile: ${POD_EVE}\nEmail: ${EMAIL_EVE}\nPassword: ${PASSWORD_EVE}`;

// This URL can be found by looking at the "token_endpoint" field at
// http://localhost:3000/.well-known/openid-configuration
// if your server is hosted at http://localhost:3000/.
export const TOKEN_ENDPOINT = `${SOLID_IDENTITY_PROVIDER}/.oidc/token`;

export async function getAccessToken(id, secret) {
    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await generateDpopKeyPair();

    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;

    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            // The header needs to be in base64 encoding.
            authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
            dpop: await createDpopHeader(TOKEN_ENDPOINT, 'POST', dpopKey),
        },
        body: 'grant_type=client_credentials&scope=webid',
    });

    if (!response.ok) {
        throw new Error(`Getting new access token failed: ${await response.text()}`);
     }

    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    console.log(await response.json());
    const { access_token: accessToken } = await response.json();
    return { dpopKey, accessToken };
}

export function addToTextArea(textAreaId, text) {
    const oldText = $(textAreaId).val();
    $(textAreaId).text(oldText + text + "\n");
}