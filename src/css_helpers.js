import { createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';
import { createRemoteJWKSet, jwtVerify } from "jose";
import { SOLID_IDENTITY_PROVIDER, CREDENTIALS_ENDPOINT, TOKEN_ENDPOINT, JWKS_ENDPOINT, REGISTER_ENDPOINT } from './constants';

const TOKEN_NAME = "demo-token";

// https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/identity-provider/
export async function registerNewUser(email, password, podName) {
    const registerConfig = {
        email,
        password,
        confirmPassword: password,
        createWebId: true,
        register: true,
        createPod: true,
        rootPod: false,
        podName,
    };
    return fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(registerConfig),
    });
}

// https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
async function sendPostRequestToCredentials(body) {
    return fetch(CREDENTIALS_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
    });
}

export async function listTokensForUser(email, password) {
    return sendPostRequestToCredentials(
        JSON.stringify({ email, password })
    );
}

export async function deleteTokenForUser(email, password, tokenId) {
    return sendPostRequestToCredentials(
        JSON.stringify({ email, password, delete: tokenId })
    );
}

export async function generateTokenForUser(email, password) {
    return sendPostRequestToCredentials(
        JSON.stringify({ email, password, name: TOKEN_NAME })
    );
}

export async function getAccessToken(id, secret) {
    // A key pair is needed for encryption.
    const dpopKeyPair = await generateDpopKeyPair();
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
    // The header needs to be in base64 encoding.
    const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
    const dpopHeader = await createDpopHeader(TOKEN_ENDPOINT, 'POST', dpopKeyPair);

    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            authorization: authHeader,
            'content-type': 'application/x-www-form-urlencoded',
            dpop: dpopHeader,
        },
        body: 'grant_type=client_credentials&scope=webid',
    });

    // Occasionally results in 
    // Error: Getting new access token failed: {"error":"invalid_dpop_proof","error_description":"invalid DPoP key binding"}
    // When this happens, the server logs say:
    // Error verifying WebID via Bearer access token: SolidIdentityDPoPError DPoP options missing for DPoP bound access token verification
    // Not sure how to fix this yet.
    // For now, workaround is to refresh the page then try again
    if (!response.ok) {
        throw new Error(`Getting new access token failed: ${await response.text()}`);
    }

    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    // Sample response:
    // {
    //     "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IlYzUnFaMURkSlhQSWVDNkxMN0V4ZFowOUx3Ykd0S1JtRWZsUkxlNmowckEifQ.eyJ3ZWJpZCI6Imh0dHBzOi8vc29saWRwb2QuYXp1cmV3ZWJzaXRlcy5uZXQvQWxpY2Utcy1Qb2QvcHJvZmlsZS9jYXJkI21lIiwianRpIjoiS2I3cUhzUWJxaU5KV1NRM0xQWE5PIiwic3ViIjoiZGVtby10b2tlbl82M2ZiYzk1Mi02MWJiLTQyMmUtODQ0OS01Yzk4NmE4ZDY5ZTIiLCJpYXQiOjE2Njc0MDY0MTQsImV4cCI6MTY2NzQwNzAxNCwic2NvcGUiOiJ3ZWJpZCIsImNsaWVudF9pZCI6ImRlbW8tdG9rZW5fNjNmYmM5NTItNjFiYi00MjJlLTg0NDktNWM5ODZhOGQ2OWUyIiwiaXNzIjoiaHR0cHM6Ly9zb2xpZHBvZC5henVyZXdlYnNpdGVzLm5ldC8iLCJhdWQiOiJzb2xpZCIsImNuZiI6eyJqa3QiOiJmM1JNRzhtd0tJMk81S1FrTFFVY3V6MnFPN0V4T2Z1RVhlTVRQZFU3ZDIwIn19.gQ0_dZLXmEuLPL4uQ-gam1QP8IqglD0xEnRa5_9NOiIgNy7LSYUCUlLaQg7j7IZA-mxWvKxzq3cpa-qoty9Gpw",
    //     "expires_in": 600,
    //     "token_type": "DPoP",
    //     "scope": "webid"
    // }
    const { access_token: accessToken } = await response.json();
    return { dpopKeyPair, accessToken };
}

// This is similar to the getWebidFromTokenPayload function in @inrupt/solid-client-authn-core
// But it takes a provided access token instead of reading one from the session
export async function getWebIdFromToken(accessToken) {
    // Step 1. Get public keys from the identity provider
    const JWKS = createRemoteJWKSet(new URL(JWKS_ENDPOINT))
    // Step 2. Decode and verify access token claims using public keys
    // Note: you could use jose.decodeJwt to just get the webId without verifying
    // This checks just issuer and audience.
    // For other claims that could be verified, see: https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims
    const { payload } = await jwtVerify(
        accessToken,
        JWKS,
        {
            issuer: `${SOLID_IDENTITY_PROVIDER}/`,
            // Not sure why audience is "solid", seems to be a default in CSS
            audience: "solid",
        }
    );
    // Sample decoded access token:
    // {
    //     "webid": "https://solidpod.azurewebsites.net/Alice-s-Pod/profile/card#me",
    //     "jti": "G_Fav2XkrZiArOeYcxBf-",
    //     "sub": "demo-token_f16e45e8-464d-4458-b371-6ce256c5a824",
    //     "iat": 1667907860,
    //     "exp": 1667908460,
    //     "scope": "webid",
    //     "client_id": "demo-token_f16e45e8-464d-4458-b371-6ce256c5a824",
    //     "iss": "https://solidpod.azurewebsites.net/",
    //     "aud": "solid",
    //     "cnf": {
    //         "jkt": "ISO3poo8rDbEtflog3vSNOQvZrdcFg8JiX963zgeLdE"
    //     }
    // }
    return payload.webid;
}