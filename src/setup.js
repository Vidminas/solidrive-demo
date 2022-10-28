import {
    getSolidDataset,
    getThing,
    setThing,
    getStringNoLocale,
    setStringNoLocale,
    saveSolidDatasetAt,
    createContainerAt,
  } from "@inrupt/solid-client";
  import {
    Session,
  } from "@inrupt/solid-client-authn-node";
import $ from "jquery";
import { POD_ALICE, POD_BOB, POD_EVE, SOLID_IDENTITY_PROVIDER, addToTextArea, TOKEN_ENDPOINT } from "./common";

const TOKEN_NAME = "demo-token";

function getRegisteredPods() {
    $("#pods").append('<li>Dynamic retrieval is not implemented yet</li>');
    $("#pods").append(`<li><a href="${POD_ALICE}">${POD_ALICE}</a></li>`);
    $("#pods").append(`<li>${POD_BOB}</li>`);
    $("#pods").append(`<li>${POD_EVE}</li>`);
}

async function handleForm(event) {
    event.preventDefault(); // do not redirect (default on form submit)
    const submittingButton = event.originalEvent.submitter.value;
    const formData = Object.fromEntries(new FormData(event.target).entries());

    switch (submittingButton) {
        case "list-tokens":
            return listTokens(formData);
        case "delete-token":
            return deleteToken(event, formData);
        case "generate-token":
            return generateAndStoreToken(event);
    }
}

// https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/test/integration/Identity.test.ts
// https://communitysolidserver.github.io/CommunitySolidServer/5.x/docs/#community-solid-server
// https://github.com/inrupt/solid-client-authn-js/blob/8d57b6f4b22945550218655f6d838a01182fbfae/packages/browser/src/sessionInfo/SessionInfoManager.ts
// https://github.com/solid/solid-spec/blob/master/README.md#authorization-and-access-control
// https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-nodejs-script/#statically-registered-prereq

// https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
async function sendPostRequestToIDP(body) {
    return fetch(`${SOLID_IDENTITY_PROVIDER}/idp/credentials/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
    });
}

async function listTokens(formData) {
    try {
        const response = await sendPostRequestToIDP(JSON.stringify({ email: formData.email, password: formData.password }));
        if (!response.ok) {
            throw new Error(`Token generation failed: ${await response.text()}`);
        }

        const tokens = await response.json();
        for (const token of tokens) {
            $("#tokens").append(`<option>${token}</option>`);
        }

        addToTextArea("#token-output", `Listed user tokens: ${tokens}`);
    } catch (error) {
        addToTextArea("#token-output", error);
    }
}

async function deleteToken(event, formData) {
    const tokensDropdown = event.target.tokens;
    const tokenId = tokensDropdown.options[tokensDropdown.selectedIndex].text;
    
    try {
        const response = await sendPostRequestToIDP(JSON.stringify({ email: formData.email, password: formData.password, delete: tokenId }));
        if (!response.ok) {
            throw new Error(`Token deletion failed: ${await response.text()}`);
        }

        tokensDropdown.remove(tokensDropdown.selectedIndex);
        addToTextArea("#token-output", `Successfully deleted token`);
    } catch (error) {
        addToTextArea("#token-output", error);
    }
}

async function generateAndStoreToken(event) {
    const data = Object.fromEntries(new FormData(event.target).entries());
    
    try {
        const { id, secret } = await generateToken(data.email, data.password);
        addToTextArea("#token-output", `Successfully generated new token ${id}`);

        const session = new Session();
        session.onNewRefreshToken((newToken) => {
            console.log('New refresh token: ', newToken);
          });

        // const { dpopKey, accessToken } = await getAccessToken(id, secret);
        // const authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });
        await session.login({
            clientId: id,
            clientSecret: secret,
            oidcIssuer: SOLID_IDENTITY_PROVIDER,
            redirectUrl: window.location.href,
        });

        if (session.info.isLoggedIn) {
            // 3. Your session should now be logged in, and able to make authenticated requests.
            session
              // You can change the fetched URL to a private resource, such as your Pod root.
              .fetch(session.info.webId)
              .then((response) => {
                return response.text();
              })
              .then(console.log);
          }

        // await storeToken(authFetch, id, secret, );
        addToTextArea("#token-output", `Saved token details in user's pod`);
    } catch (error) {
        addToTextArea("#token-output", error);
    }
}

async function generateToken(email, password) {
    const response = await fetch(`${SOLID_IDENTITY_PROVIDER}/idp/credentials/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, name: TOKEN_NAME }),
    });

    if (!response.ok) {
        throw new Error(`Token generation failed: ${await response.text()}`);
    }

    // These are the identifier and secret of your token.
    // Store the secret somewhere safe as there is no way to request it again from the server!
    // const { id, secret } = await response.json();
    return response.json();
}

async function storeToken(authFetch, id, secret) {
    // let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
    //     fetch: authFech,
    //   });
    console.log(await authFetch(`${SOLID_IDENTITY_PROVIDER}/idp/`))
}


$(function() {
    const register_link = `${SOLID_IDENTITY_PROVIDER}/idp/register/`
    $("#solid-identity-provider-register").html(`[<a target="_blank" href="${register_link}">${register_link}</a>]`);

    getRegisteredPods();
    $("#token-form").on("submit", handleForm);
})