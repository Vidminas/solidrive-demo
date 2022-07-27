import {
  getSolidDataset,
  getThing,
  getInteger,
  setInteger,
  setThing,
  getStringNoLocale,
  saveSolidDatasetAt,
} from "@inrupt/solid-client";
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch,
} from "@inrupt/solid-client-authn-browser";
import { VCARD } from "@inrupt/vocab-common-rdf";

let points = 0;
let sidebarItems;
const SOLID_IDENTITY_PROVIDER = "https://solidpod.azurewebsites.net";

async function loginToIDP() {
  await login({
    oidcIssuer: SOLID_IDENTITY_PROVIDER,
    clientName: "Pizza Clicker",
    redirectUrl: window.location.href,
  });
}

async function handleRedirectAfterLogin() {
  await handleIncomingRedirect({
    url: window.location.href,
  });

  const session = getDefaultSession();
  if (session.info.isLoggedIn) {
    const profileDocumentUrl = new URL(session.info.webId);
    profileDocumentUrl.hash = "";

    const myDataset = await getSolidDataset(profileDocumentUrl.href, {
      fetch: session.fetch,
    });

    const profile = getThing(myDataset, session.info.webId);

    const formattedName = getStringNoLocale(profile, VCARD.fn);
    document.getElementById("user").textContent = formattedName;

    points = getInteger(profile, VCARD.note) || 0;
    document.getElementById("points").innerText = points;

    document.getElementById("loginButton").setAttribute("disabled", "disabled");
    document.getElementById("saveButton").removeAttribute("disabled");
  }
}

handleRedirectAfterLogin();

async function savePointsInProfile() {
  const session = getDefaultSession();
  if (!session.info.isLoggedIn) {
    return;
  }

  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  const profileDocumentUrl = new URL(session.info.webId);
  profileDocumentUrl.hash = "";

  let myDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: fetch,
  });
  let profile = getThing(myDataset, session.info.webId);
  profile = setInteger(profile, VCARD.note, points);
  myDataset = setThing(myDataset, profile);

  await saveSolidDatasetAt(profileDocumentUrl.href, myDataset, {
    fetch: fetch,
  });
}

class SidebarItem {
  constructor(src, alt, value) {
    this.src = src;
    this.alt = alt;
    this.value = value;
    this.id = document.getElementsByClassName("sidebar-item").length + 1;
    document.getElementById("sidebar").innerHTML +=
      '<div id="pic' +
      this.id +
      '" class="sidebar-item">' +
      '<img src="' +
      this.src +
      '" alt="' +
      this.alt +
      '">' +
      "<p>" +
      this.value +
      "</p>" +
      "</div>" +
      '<hr class="noselect" />';
  }
  addPoints() {
    //add Points
    points += this.value;
    document.getElementById("points").innerText = points;
  }
  Border(x) {
    //change border to see what is selected
    document.getElementById("pic" + this.id).style.borderColor = x;
  }
}

function resetPoints() {
  points = 0;
  document.getElementById("points").innerHTML = points;
}

var onPageClick = (function () {
  //change selection or add points on click
  var selectedPic = "pic1";
  return function (e) {
    if (
      e.target.id == selectedPic ||
      e.target.parentElement.id == selectedPic
    ) {
      return;
    }
    if (
      e.target.parentElement.className == "sidebar-item" ||
      e.target.className == "sidebar-item"
    ) {
      sidebarItems[selectedPic].Border("#dddddd");
      if (e.target.className == "sidebar-item") {
        selectedPic = e.target.id;
      } else {
        selectedPic = e.target.parentElement.id;
      }
      sidebarItems[selectedPic].Border("yellow");
    } else if (e.target.id != "sidebar" && e.target.className != "noselect") {
      sidebarItems[selectedPic].addPoints();
    }
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  const saveButton = document.getElementById("saveButton");
  saveButton.setAttribute("disabled", "disabled");
  saveButton.onclick = savePointsInProfile;

  const resetButton = document.getElementById("resetButton");
  resetButton.onclick = resetPoints;

  const loginButton = document.getElementById("loginButton");
  loginButton.onclick = function() {
    loginToIDP();
  };

  window.onmousedown = onPageClick;

  sidebarItems = {
    pic1: new SidebarItem("pizza_1.png", "1 Pizza", 1),
    pic2: new SidebarItem("pizza_5.png", "5 Pizzas", 5),
    pic3: new SidebarItem("pizza_10.png", "10 Pizzas", 10),
    pic4: new SidebarItem("pizza_20.png", "20 Pizzas", 20),
  };
  sidebarItems.pic1.Border("yellow");
});
