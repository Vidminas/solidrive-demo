export const SOLID_IDENTITY_PROVIDER = "https://solidpod.azurewebsites.net";
// These URLs can be found by looking at the relevant fields at
// ${SOLID_IDENTITY_PROVIDER}/.well-known/openid-configuration
export const REGISTER_ENDPOINT = `${SOLID_IDENTITY_PROVIDER}/idp/register/`;
export const CREDENTIALS_ENDPOINT = `${SOLID_IDENTITY_PROVIDER}/idp/credentials/`;
export const TOKEN_ENDPOINT = `${SOLID_IDENTITY_PROVIDER}/.oidc/token`;
export const JWKS_ENDPOINT = `${SOLID_IDENTITY_PROVIDER}/.oidc/jwks`;

// URL where to store token IDs and secrets - unsafe - only for this demo!
export const POD_TOKENS_URL = `${SOLID_IDENTITY_PROVIDER}/demo-tokens`;

// Hardcoded login details
export const EMAIL_SOLIDRIVE = "admin@solidrive";
export const PASSWORD_SOLIDRIVE = "Solidrive";
export const POD_SOLIDRIVE = "Solidrive Pod";
export const WEBID_SOLIDRIVE = `${SOLID_IDENTITY_PROVIDER}/Solidrive-Pod/profile/card#me`;
export const SOLIDRIVE_KEYS_URL = WEBID_SOLIDRIVE.replace("profile/card#me", "keys");

export const EMAIL_ALICE = "alice@localhost";
export const PASSWORD_ALICE = "Wonderland";
export const POD_ALICE = "Alice's Pod";
export const WEBID_ALICE = `${SOLID_IDENTITY_PROVIDER}/Alice-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_ALICE = `Email: ${EMAIL_ALICE}\nPassword: ${PASSWORD_ALICE}`;

export const EMAIL_BOB = "bob@localhost";
export const PASSWORD_BOB = "AfraidOfNothing";
export const POD_BOB = "Bob's Pod";
export const WEBID_BOB = `${SOLID_IDENTITY_PROVIDER}/Bob-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_BOB = `Email: ${EMAIL_BOB}\nPassword: ${PASSWORD_BOB}`;

export const EMAIL_EVE = "eve@localhost";
export const PASSWORD_EVE = "HavingFun";
export const POD_EVE = "Eve's Pod";
export const WEBID_EVE = `${SOLID_IDENTITY_PROVIDER}/Eve-s-Pod/profile/card#me`;
export const LOGIN_DETAILS_EVE = `Email: ${EMAIL_EVE}\nPassword: ${PASSWORD_EVE}`;
