import {
  getSolidDataset,
  getThing,
  createThing,
  createSolidDataset,
  deleteContainer,
  getThingAll,
} from "@inrupt/solid-client";
import $ from "jquery";

export function addToTextArea(textAreaId, text) {
  const oldText = $(textAreaId).val();
  $(textAreaId).text(oldText + text + "\n");
}

export async function getOrCreateSolidDataset(datasetUrl, authFetch) {
  let dataset;
  try {
    if (authFetch) {
      dataset = await getSolidDataset(datasetUrl, { fetch: authFetch });
    } else {
      dataset = await getSolidDataset(datasetUrl);
    }
  } catch (err) {
    if (err.response.status === 404) {
      // If the dataset doesn't exist yet, that's okay, just create a new one
      dataset = createSolidDataset();
    } else {
      // But make sure any other errors get surfaced
      throw err;
    }
  }

  return dataset;
}

export function getOrCreateThing(dataset, thingUrl) {
  let tokenThing = getThing(dataset, thingUrl);
  if (tokenThing === null) {
    tokenThing = createThing({ url: thingUrl });
  }
  return tokenThing;
}

export async function deleteOrIgnoreContainer(containerUrl, authFetch) {
  const res = await authFetch(containerUrl);
  if (res.status === 404) {
    // If the container does not exist - nothing to delete, safe to quit early
    return;
  }

  // If the container is empty, we can just delete
  // but if not, we must delete all things contained within first
  const container = await getSolidDataset(containerUrl, { fetch: authFetch });
  if (getThingAll(container) === []) {
    await deleteContainer(containerUrl, { fetch: authFetch });
  } else {
    throw new Error("Cannot delete Solidrive container - it is not empty. Recursive delete not implemented yet...");
  }
}