import {
  getSolidDataset,
  getThing,
  setThing,
  getStringNoLocale,
  setStringNoLocale,
  saveSolidDatasetAt,
  universalAccess,
  createContainerAt,
} from "@inrupt/solid-client";
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch,
} from "@inrupt/solid-client-authn-browser";
import { VCARD } from "@inrupt/vocab-common-rdf";
import "smartwizard/dist/css/smart_wizard_arrows.css";
import smartWizard from 'smartwizard';
import "image-picker/image-picker/image-picker.css";
import imagepicker from 'image-picker';

import { SOLID_IDENTITY_PROVIDER, LOGIN_DETAILS_ALICE, LOGIN_DETAILS_BOB, LOGIN_DETAILS_EVE } from "./common";

const NOT_ENTERED_WEBID =
  "...not logged in yet - but enter any WebID to read from its profile...";
const REDIRECT_URL = window.location.href;
const SOLIDRIVE_CONTAINER_URL = "solidrive/";
const buttonLogin = document.getElementById("btnLogin");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");


// 1a. Start Login Process. Call session.login() function.
async function loginToIDP() {
  await login({
    oidcIssuer: SOLID_IDENTITY_PROVIDER,
    clientName: "Solidrive app",
    redirectUrl: REDIRECT_URL,
  });
}

// 1b. Login Redirect. Call session.handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
  const sessionInfo = await handleIncomingRedirect(REDIRECT_URL);

  if (!sessionInfo.isLoggedIn) {
    $("#step-2-output").text("Not logged in");
  } else {
    $("#step-2-output").text(`Logged in with WebID ${sessionInfo.webId}`);
    $("#webID").val(sessionInfo.webId);
    $('#smartwizard').smartWizard("goToStep", 1, true);
  }
}

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
handleRedirectAfterLogin();

// 2. Write to profile
async function writeProfile() {
  const name = document.getElementById("input_name").value;

  const session = getDefaultSession();
  if (!session.info.isLoggedIn) {
    // You must be authenticated to write.
    document.getElementById(
      "labelWriteStatus"
    ).textContent = `...you can't write [${name}] until you first login!`;
    document.getElementById("labelWriteStatus").setAttribute("role", "alert");
    return;
  }
  const webID = session.info.webId;
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: fetch,
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);

  // Using the name provided in text field, update the name in your profile.
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.
  profile = setStringNoLocale(profile, VCARD.fn, name);

  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);

  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch,
  });

  // Update the page with the retrieved values.
  document.getElementById(
    "labelWriteStatus"
  ).textContent = `Wrote [${name}] as name successfully!`;
  document.getElementById("labelWriteStatus").setAttribute("role", "alert");
  document.getElementById(
    "labelFN"
  ).textContent = `...click the 'Read Profile' button to to see what the name might be now...?!`;
}

// 3. Read profile
async function readProfile() {
  const webID = document.getElementById("webID").value;

  if (webID === NOT_ENTERED_WEBID) {
    document.getElementById(
      "labelFN"
    ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
    return false;
  }

  try {
    new URL(webID);
  } catch (_) {
    document.getElementById(
      "labelFN"
    ).textContent = `Provided WebID [${webID}] is not a valid URL - please try again`;
    return false;
  }

  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // Profile is public data; i.e., you do not need to be logged in to read the data.
  // For illustrative purposes, shows both an authenticated and non-authenticated reads.

  const session = getDefaultSession();
  let myDataset;
  try {
    if (session.info.isLoggedIn) {
      myDataset = await getSolidDataset(profileDocumentUrl.href, {
        fetch: fetch,
      });
    } else {
      myDataset = await getSolidDataset(profileDocumentUrl.href);
    }
  } catch (error) {
    document.getElementById(
      "labelFN"
    ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
    return false;
  }

  const profile = getThing(myDataset, webID);

  // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

  const formattedName = getStringNoLocale(profile, VCARD.fn);

  // Update the page with the retrieved values.
  document.getElementById("labelFN").textContent = `[${formattedName}]`;
}

// https://docs.inrupt.com/developer-tools/javascript/client-libraries/reference/glossary/#term-Container
async function createSolidriveContainer() {
  const session = getDefaultSession();
  const outputText = $("#step-3-output").val();

  if (!session.info.isLoggedIn) {
    $("#step-3-output").text(outputText + "Cannot create Solidrive container - user is not logged in!\n");
    return;
  }

  // https://solidpod.azurewebsites.net/Alice-s-Pod/profile/card#me
  const podURL = session.info.webId.replace("profile/card#me", SOLIDRIVE_CONTAINER_URL);

  try {
    await createContainerAt(podURL, { fetch: fetch });
  } catch (error) {
    $("#step-3-output").text(outputText + "Error creating Solidrive container:\n" + error + "\n");
    return;
  }

  $("#step-3-output").text(outputText + `Successfully created Solidrive container at ${podURL}\n`);
}

async function requestAccessToSolidrive(solidriveCollectionPath, resourceOwner){
  // // ExamplePrinter sets the requested access (if granted) to expire in 5 minutes.
  // let accessExpiration = new Date( Date.now() +  5 * 60000 );

  // // Call `issueAccessRequest` to create an access request
  // //
  // const requestVC = await issueAccessRequest(
  //     {
  //        "access":  { read: true },
  //        "resources": photosToPrint,   // Array of URLs
  //        "resourceOwner": resourceOwner,
  //        "expirationDate": accessExpiration,
  //        "purpose": [ "https://example.com/purposes#print" ]
  //     },
  //     { fetch : session.fetch } // From the requestor's (i.e., ExamplePrinter's) authenticated session
  // );
  universalAccess.setPublicAccess()
}

writeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  writeProfile();
});

readForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readProfile();
});

$(function() {
  $("#solid-identity-provider").html(`[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`);

  $('#smartwizard').smartWizard({
    theme: 'arrows',
    transition: {
      animation: 'slideHorizontal'
  },
  });

  $("select").imagepicker({
    hide_select: true,
    show_label: true,
    initialized: function(imagePicker) {
      $("#login-details").text(LOGIN_DETAILS_ALICE);
    },
    changed: function(select, newValues, oldValues, event) {
      switch (newValues[0]) {
        case "Alice":
          $("#login-details").text(LOGIN_DETAILS_ALICE);
          break;
        case "Bob":
          $("#login-details").text(LOGIN_DETAILS_BOB);
          break;
        case "Eve":
          $("#login-details").text(LOGIN_DETAILS_EVE);
          break;
      }
    }
  });

  $("#login-button").on("click", loginToIDP);
  $("#create-container-button").on("click", createSolidriveContainer);
});