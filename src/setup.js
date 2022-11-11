import {
  saveSolidDatasetAt,
  setThing,
  getPodUrlAll,
  setStringNoLocale,
} from "@inrupt/solid-client";
import { XSD } from "@inrupt/vocab-common-rdf";
import $ from "jquery";
import {
  EMAIL_SOLIDRIVE,
  PASSWORD_SOLIDRIVE,
  POD_SOLIDRIVE,
  WEBID_SOLIDRIVE,
  EMAIL_ALICE,
  PASSWORD_ALICE,
  POD_ALICE,
  WEBID_ALICE,
  EMAIL_BOB,
  PASSWORD_BOB,
  POD_BOB,
  WEBID_BOB,
  EMAIL_EVE,
  PASSWORD_EVE,
  POD_EVE,
  WEBID_EVE,
  POD_TOKENS_URL,
  REGISTER_ENDPOINT,
} from "./constants";
import {
  deleteTokenForUser,
  generateTokenForUser,
  listTokensForUser,
  registerNewUser,
} from "./css_helpers";
import {
  addToTextArea,
  getOrCreateSolidDataset,
  getOrCreateThing,
} from "./utils";

async function registerPod(event) {
  const { pod, email, password } = event.data;
  try {
    const res = await registerNewUser(email, password, pod);
    if (res.ok) {
      addToTextArea("#pod-output", `Successfully registered ${pod}`);
    } else {
      throw await res.text();
    }
  } catch (err) {
    addToTextArea("#pod-output", `Error registering ${pod}: ${err}`);
  }
}

async function getRegisteredPods() {
  const pods = [
    [POD_SOLIDRIVE, WEBID_SOLIDRIVE, EMAIL_SOLIDRIVE, PASSWORD_SOLIDRIVE],
    [POD_ALICE, WEBID_ALICE, EMAIL_ALICE, PASSWORD_ALICE],
    [POD_BOB, WEBID_BOB, EMAIL_BOB, PASSWORD_BOB],
    [POD_EVE, WEBID_EVE, EMAIL_EVE, PASSWORD_EVE],
  ];

  for (const [pod, webid, email, password] of pods) {
    // Check if pod exists, no need for full GET, HEAD is enough
    const res = await fetch(webid, "HEAD");
    const button = $(`<button>Register</button>`);
    button.css("margin-left", "1em");
    button.on("click", { pod, email, password }, registerPod);

    if (res.ok) {
      // If the pod exists, add an item with a hyperlink
      const li = $(`<li><a href="${webid}">${webid}</a></li>`);
      li.append(button);
      $("#pods").append(li);
    } else if (res.status === 404) {
      // If the pod does not exist, add an item without hyperlink
      const li = $(`<li>${webid}</li>`);
      li.append(button);
      $("#pods").append(li);
    } else {
      addToTextArea("#pod-output", `Error fetching ${webid}: [${res.status}] ${res.statusText}`);
    }
  }
  // This should get related pods if users have them, but not sure if we need this
  // see: https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/profile_webid.html#getpodurlall
  // getPodUrlAll(`${SOLID_IDENTITY_PROVIDER}/`)
  //   .then((res) => console.log("Registered pods", res))
  //   .catch((err) => console.log("Error getting registered pods", err));
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
      return generateAndStoreToken(formData);
  }
}

async function listTokens(formData) {
  try {
    const response = await listTokensForUser(formData.email, formData.password);
    if (!response.ok) {
      throw new Error(`Token listing failed: ${await response.text()}`);
    }

    const tokens = await response.json();
    // clear to prevent double adding tokens if list is pressed twice
    $("#tokens").empty();
    for (const token of tokens) {
      $("#tokens").append(`<option>${token}</option>`);
    }

    addToTextArea("#token-output", `Listed user tokens: [${tokens}]`);
  } catch (error) {
    addToTextArea("#token-output", error);
  }
}

async function deleteToken(event, formData) {
  const tokensDropdown = event.target.tokens;
  if (tokensDropdown.selectedIndex === -1) {
    return;
  }
  const selectedTokenId =
    tokensDropdown.options[tokensDropdown.selectedIndex].text;

  try {
    const response = await deleteTokenForUser(
      formData.email,
      formData.password,
      selectedTokenId
    );
    if (!response.ok) {
      throw new Error(`Token deletion failed: ${await response.text()}`);
    }

    tokensDropdown.remove(tokensDropdown.selectedIndex);
    addToTextArea("#token-output", `Successfully deleted token`);
  } catch (error) {
    addToTextArea("#token-output", error);
  }
}

async function generateAndStoreToken(formData) {
  try {
    const response = await generateTokenForUser(
      formData.email,
      formData.password
    );
    if (!response.ok) {
      throw new Error(`Token generation failed: ${await response.text()}`);
    }

    // These are the identifier and secret of your token.
    // Store the secret somewhere safe as there is no way to request it again from the server!
    const { id, secret } = await response.json();
    $("#tokens").append(`<option>${id}</option>`);
    addToTextArea("#token-output", `Successfully generated new token ${id}`);

    await storeToken(formData.email, id, secret);
    addToTextArea("#token-output", `Saved token details in user's pod`);
  } catch (error) {
    addToTextArea("#token-output", error);
  }
}

// https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-data/
async function storeToken(email, id, secret) {
  let tokenDataset = await getOrCreateSolidDataset(POD_TOKENS_URL);
  let tokenThing = getOrCreateThing(
    tokenDataset,
    `${POD_TOKENS_URL}#${encodeURIComponent(email)}`
  );
  tokenThing = setStringNoLocale(
    tokenThing,
    XSD.string,
    JSON.stringify({ id, secret })
  );
  tokenDataset = setThing(tokenDataset, tokenThing);
  await saveSolidDatasetAt(POD_TOKENS_URL, tokenDataset);
}

$(function () {
  $("#solid-identity-provider-register").html(
    `[<a target="_blank" href="${REGISTER_ENDPOINT}">${REGISTER_ENDPOINT}</a>]`
  );
  getRegisteredPods();
  $("#token-form").on("submit", handleForm);
});
