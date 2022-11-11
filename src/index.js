import {
  getSolidDataset,
  hasFallbackAcl,
  hasAccessibleAcl,
  createAclFromFallbackAcl,
  getStringNoLocale,
  universalAccess,
  createContainerAt,
  getThingAll,
  saveAclFor,
  getSolidDatasetWithAcl,
  createSolidDataset,
  createThing,
  setStringNoLocale,
  setThing,
  saveSolidDatasetInContainer,
} from "@inrupt/solid-client";
import { buildAuthenticatedFetch } from "@inrupt/solid-client-authn-core";
import { XSD } from "@inrupt/vocab-common-rdf";
import "smartwizard/dist/css/smart_wizard_arrows.css";
import smartWizard from "smartwizard";
import "image-picker/image-picker/image-picker.css";
import imagepicker from "image-picker";

import {
  SOLID_IDENTITY_PROVIDER,
  LOGIN_DETAILS_ALICE,
  LOGIN_DETAILS_BOB,
  LOGIN_DETAILS_EVE,
  POD_TOKENS_URL,
  WEBID_SOLIDRIVE,
  WEBID_EVE,
  WEBID_ALICE,
  WEBID_BOB,
} from "./constants";
import { getAccessToken, getWebIdFromToken } from "./css_helpers";
import { addToTextArea, deleteOrIgnoreContainer } from "./utils";
import { Session } from "@inrupt/solid-client-authn-node";
import { generatePassengerReview, generateTripRequest } from "./mock_data";

const SOLIDRIVE_CONTAINER_URL = "solidrive/";

async function getStoredTokens() {
  const person_token_map = {};

  try {
    const tokenDataset = await getSolidDataset(POD_TOKENS_URL);
    const tokenThings = getThingAll(tokenDataset);

    for (const tokenThing of tokenThings) {
      const tokenUrl = new URL(tokenThing.url);
      const email = decodeURIComponent(tokenUrl.hash.slice(1));
      const person = email.split("@")[0];

      const jsonToken = getStringNoLocale(tokenThing, XSD.string);
      const token = JSON.parse(jsonToken);
      person_token_map[person] = token;
    }
  } catch (err) {
    addToTextArea("#step-1-output", `Error retrieving stored tokens: ${err}`);
  }

  return person_token_map;
}

async function makeAccessTokens(person_token_map) {
  const person_auth_map = {};

  try {
    for (const person in person_token_map) {
      const { id, secret } = person_token_map[person];

      // This should work instead of the next few lines but:
      // https://github.com/inrupt/solid-client-authn-js/issues/2429
      // This approach would refresh access tokens automatically
      // const session = new Session();
      // session.login({
      //   clientId: id,
      //   clientSecret: secret,
      //   oidcIssuer: `${SOLID_IDENTITY_PROVIDER}/.well-known/openid-configuration`,
      // }).then(() => {
      //   if (session.info.isLoggedIn) {
      //     person_auth_map[person] = { authFetch: session.fetch, webId: session.info.webId };
      //   }
      // });
      const { dpopKeyPair, accessToken } = await getAccessToken(id, secret);
      const authFetch = await buildAuthenticatedFetch(fetch, accessToken, {
        dpopKey: dpopKeyPair,
      });
      const webId = await getWebIdFromToken(accessToken);
      person_auth_map[person] = { authFetch, webId };

      addToTextArea(
        "#step-1-output",
        `Successfully got access token for ${person}`
      );
    }
  } catch (err) {
    addToTextArea("#step-1-output", `Error refreshing access tokens: ${err}`);
  }

  return person_auth_map;
}

async function clearSolidriveData(event) {
  const authMap = event.data.authMap;
  const person = event.data.selectedPerson;
  try {
    const { authFetch, webId } = authMap[person];
    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    await deleteOrIgnoreContainer(solidriveDataUrl, authFetch);
    addToTextArea(
      "#step-1-output",
      `Successfully cleared Solidrive data for ${person}`
    );
  } catch (err) {
    addToTextArea(
      "#step-1-output",
      `Error clearing Solidrive data for ${person}: ${err}`
    );
  }
}

// https://docs.inrupt.com/developer-tools/javascript/client-libraries/reference/glossary/#term-Container
async function createSolidriveContainer(event) {
  const authMap = event.data.authMap;
  const person = event.data.selectedPerson;

  try {
    const { authFetch, webId } = authMap[person];
    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    await createContainerAt(solidriveDataUrl, { fetch: authFetch });

    const containerWithAcl = await getSolidDatasetWithAcl(solidriveDataUrl, {
      fetch: authFetch,
    });
    if (!hasAccessibleAcl(containerWithAcl)) {
      throw new Error(
        "The current user does not have permission to change access rights to this Resource."
      );
    }
    if (!hasFallbackAcl(containerWithAcl)) {
      throw new Error(
        "The current user does not have permission to see who currently has access to this Resource."
      );
    }
    const containerAcl = createAclFromFallbackAcl(containerWithAcl);
    await saveAclFor(containerWithAcl, containerAcl, { fetch: authFetch });
    addToTextArea(
      "#step-2-output",
      `Successfully created Solidrive container for ${person}`
    );
  } catch (err) {
    addToTextArea(
      "#step-2-output",
      `Error creating Solidrive container for ${person}: ${err}`
    );
  }
}

// https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/manage-access-policies/
async function checkSolidriveAccess(event) {
  const authMap = event.data.authMap;
  const person = event.data.selectedPerson;

  try {
    const { authFetch, webId } = authMap[person];
    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    // Fetch the access explicitly/directly set for the public.
    // The returned access can be an object { read: <boolean>, append: <boolean>, ... }
    // or null if the access data is inaccessible to the user.
    const publicAccess = await universalAccess.getPublicAccess(
      solidriveDataUrl,
      { fetch: authFetch }
    );
    addToTextArea(
      "#step-2-output",
      `Public access: ${JSON.stringify(publicAccess)}`
    );
    const agentAccess = await universalAccess.getAgentAccessAll(
      solidriveDataUrl,
      { fetch: authFetch }
    );
    addToTextArea("#step-2-output", `Agent access:`);
    for (const agent in agentAccess) {
      addToTextArea(
        "#step-2-output",
        `${agent}: ${JSON.stringify(agentAccess[agent])}`
      );
    }
  } catch (err) {
    addToTextArea(
      "#step-2-output",
      `Error checking access to ${person}'s Solidrive container: ${err}`
    );
  }
}

async function grantSolidriveAccess(event) {
  const authMap = event.data.authMap;
  const person = event.data.selectedPerson;

  try {
    const { authFetch, webId } = authMap[person];
    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    await universalAccess.setAgentAccess(
      solidriveDataUrl,
      WEBID_SOLIDRIVE,
      {
        append: true,
      },
      { fetch: authFetch }
    );
    addToTextArea(
      "#step-2-output",
      `Successfully granted append access to ${person}'s Solidrive container`
    );
  } catch (err) {
    addToTextArea(
      "#step-2-output",
      `Error granting append access to ${person}'s Solidrive container: ${err}`
    );
  }
}

async function revokeSolidriveAccess(event) {
  const authMap = event.data.authMap;
  const person = event.data.selectedPerson;

  try {
    const { authFetch, webId } = authMap[person];
    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    await universalAccess.setAgentAccess(
      solidriveDataUrl,
      WEBID_SOLIDRIVE,
      {
        append: false,
      },
      { fetch: authFetch }
    );
    addToTextArea(
      "#step-2-output",
      `Successfully revoked append access to ${person}'s Solidrive container`
    );
  } catch (err) {
    addToTextArea(
      "#step-2-output",
      `Error revoking append access to ${person}'s Solidrive container: ${err}`
    );
  }
}

// Should refactor so these global variables aren't needed, but I'm cutting corners for now
const activeTripRequests = {};
const money = {
  "alice": 0,
  "bob": 0,
  "eve": 0,
};
const fuelPerKmCost = 2;

function showTripRequest(event) {
  const person = event.data.selectedPerson;
  if (activeTripRequests[person]) {
    addToTextArea("#step-3-output", `${person} already has an oustanding trip request!`);
    return;
  }
  activeTripRequests[person] = generateTripRequest();
  addToTextArea("#step-3-output", `Trip request for ${person}`);
  addToTextArea("#step-3-output", JSON.stringify(activeTripRequests[person]));
  addToTextArea("#step-3-output", "------ Accept or Reject? -------");
}

async function acceptTripRequest(event) {
  const person = event.data.selectedPerson;
  const { webId } = event.data.authMap[person];
  const { authFetch: solidriveFetch } = event.data.authMap["admin"];

  const tripRequest = activeTripRequests[person];
  if (!tripRequest) {
    addToTextArea("#step-3-output", `${person} has no outstanding trip requests!`);
    return;
  }

  addToTextArea("#step-3-output", "Accepted trip request");

  money[person] += tripRequest.payment;
  addToTextArea("#step-3-output", `${person} earned $${tripRequest.payment}. They now have: $${money[person]}`);
  const fuelCost = tripRequest.distance * fuelPerKmCost;
  money[person] -= fuelCost;
  addToTextArea("#step-3-output", `But the trip took them ${tripRequest.distance}km and they had to pay $${fuelCost} for fuel.`);
  const review = generatePassengerReview();
  if (review) {
    addToTextArea("#step-3-output", `The passenger left a review: ${review}`);
  }

  tripRequest.review = review;
  activeTripRequests[person] = null;

  try {
    let dataset = createSolidDataset();
    let tripThing = createThing({ name: `trip-${tripRequest.id}`});
    tripThing = setStringNoLocale(
      tripThing,
      XSD.string,
      JSON.stringify(tripRequest)
    );
    dataset = setThing(dataset, tripThing);

    const solidriveDataUrl = webId.replace(
      "profile/card#me",
      SOLIDRIVE_CONTAINER_URL
    );
    await saveSolidDatasetInContainer(solidriveDataUrl, dataset, { fetch: solidriveFetch });
  } catch (err) {
    addToTextArea("#step-3-output", `Error saving trip data: ${err}`);
  }
}

function rejectTripRequest(event) {
  const person = event.data.selectedPerson;
  if (!activeTripRequests[person]) {
    addToTextArea("#step-3-output", `${person} has no outstanding trip requests!`);
    return;
  }
  activeTripRequests[person] = null;
  addToTextArea("#step-3-output", "Rejected trip request");
}

$(async function () {
  $("#solid-identity-provider").html(
    `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`
  );

  $("#smartwizard").smartWizard({
    theme: "arrows",
    transition: {
      animation: "slideHorizontal",
    },
  });

  let selectedPerson;

  const imagePicker = $("select").imagepicker({
    hide_select: true,
    show_label: true,
    initialized: function (imagePicker) {
      $("#login-details").text(LOGIN_DETAILS_ALICE);
      $("#driver-webid").html(`<a href="${WEBID_ALICE}">${WEBID_ALICE}</a>`);
      selectedPerson = "alice";
    },
    changed: function (select, newValues, oldValues, event) {
      switch (newValues[0]) {
        case "alice":
          $("#login-details").text(LOGIN_DETAILS_ALICE);
          $("#driver-webid").html(`<a href="${WEBID_ALICE}">${WEBID_ALICE}</a>`);
          selectedPerson = "alice";
          break;
        case "bob":
          $("#login-details").text(LOGIN_DETAILS_BOB);
          $("#driver-webid").html(`<a href="${WEBID_BOB}">${WEBID_BOB}</a>`);
          selectedPerson = "bob";
          break;
        case "eve":
          $("#login-details").text(LOGIN_DETAILS_EVE);
          $("#driver-webid").html(`<a href="${WEBID_EVE}">${WEBID_EVE}</a>`);
          selectedPerson = "eve";
          break;
      }
    },
  });

  const tokenMap = await getStoredTokens();
  const authMap = await makeAccessTokens(tokenMap);
  $("#reset-button").on(
    "click",
    { authMap, selectedPerson },
    clearSolidriveData
  );
  $("#create-container-button").on(
    "click",
    { authMap, selectedPerson },
    createSolidriveContainer
  );
  $("#check-access-button").on(
    "click",
    { authMap, selectedPerson },
    checkSolidriveAccess
  );
  $("#grant-access-button").on(
    "click",
    { authMap, selectedPerson },
    grantSolidriveAccess
  );
  $("#limit-access-button").on(
    "click",
    { authMap, selectedPerson },
    revokeSolidriveAccess
  );

  $("#wait-trip-request").on("click", { selectedPerson }, showTripRequest);
  $("#accept-trip-request").on("click", { authMap, selectedPerson }, acceptTripRequest);
  $("#reject-trip-request").on("click", { selectedPerson }, rejectTripRequest);
});
