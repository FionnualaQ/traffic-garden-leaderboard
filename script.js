var SHEET_ID = "1PyHJnqxj0fAzzbr6nHhIo_4i2QcYIz8WFFCyz-UN0n0";
var API_KEY = "AIzaSyD4q3JR3nJ9ohF8ggsO97rGVZP5qc5Fn5E";

var DEFAULT_MARKER_ICON = "bike.svg";

function getIconColorData() {
  return new Promise((resolve, reject) => {
    $.getJSON(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Icons!A2:D3000?majorDimension=ROWS&key=${API_KEY}`
    )
      .done(function (data) {
        resolve(data.values);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        reject(new Error(textStatus + ": " + errorThrown));
      });
  });
}

function getUrlsFromIconRules(iconRules) {
  const iconUrls = {};
  iconRules.forEach((rule) => {
    const type = rule[0];
    const filename = rule[2];
    let foundUrl = null;

    if (filename) {
      // Try .svg
      let svgPath = `icons/${filename}.svg`;
      try {
        if (
          $.ajax({ url: svgPath, type: "HEAD", async: false }).status === 200
        ) {
          foundUrl = `url(${svgPath})`;
        }
      } catch (e) {}

      // Try .png if .svg not found
      if (!foundUrl) {
        let pngPath = `icons/${filename}.png`;
        try {
          if (
            $.ajax({ url: pngPath, type: "HEAD", async: false }).status === 200
          ) {
            foundUrl = `url(${pngPath})`;
          }
        } catch (e) {}
      }

      if (!foundUrl) {
        console.warn(`Icon file not found: icons/${filename}, using fallback`);
        foundUrl = `url(icons/${DEFAULT_MARKER_ICON})`;
      }
    } else {
      foundUrl = `url(icons/${DEFAULT_MARKER_ICON})`;
    }

    iconUrls[type] = foundUrl;
  });
  return iconUrls;
}

function getColor(iconRules, type) {
  const rule = iconRules.find((x) => x[0] === type);
  if (rule) {
    return rule[1]; // hex color
  }
  return "#168039"; // fallback
}

function makeMarkerIcon(iconRules, icons, businessType, id) {
  var el = document.createElement("div");
  el.className = "marker";
  el.id = id;

  el.style.backgroundImage =
    icons[businessType] ?? `url(icons/${DEFAULT_MARKER_ICON})`;
  el.style.backgroundColor = getColor(iconRules, businessType);
  return el;
}

$.getJSON(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/North-America!A2:J3000?majorDimension=ROWS&key=${API_KEY}`,
  async function (response) {
    const iconRules = await getIconColorData();
    const icons = await getUrlsFromIconRules(iconRules);

    const byState = {};

    response.values.forEach(function (row) {
      let state = row[9];
      if (byState[state] == null) {
        byState[state] = [];
      }
      byState[state].push(row);
    });

    const stateCounts = Object.entries(byState)
      .map(([state, items]) => ({
        name: state,
        count: items.length,
      }))
      .sort((a, b) => b.count - a.count);

    const tbody = document.getElementsByTagName("tbody")[0];
    const rows = stateCounts.map((entry, idx) => {
      const tr = document.createElement("tr");
      tr.classList.add("expandable-row");
      tr.dataset.state = entry.name;
      tr.dataset.expanded = "false";

      const th = document.createElement("th");
      th.textContent = idx + 1;
      th.setAttribute("scope", "row");

      const td1 = document.createElement("td");

      const stateName = document.createElement("div");
      stateName.textContent = entry.name;
      td1.appendChild(stateName);

      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("details-content");

      byState[entry.name].forEach(function (item) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "details-content-row";
        const icon = makeMarkerIcon(iconRules, icons, item[2], item[8]);
        const p = document.createElement("p");
        p.textContent = item[0];
        rowDiv.append(icon, p);
        detailsDiv.append(rowDiv);
      });

      td1.appendChild(detailsDiv);

      const td2 = document.createElement("td");
      td2.textContent = entry.count;

      tr.append(th, td1, td2);

      // Add click handler
      tr.addEventListener("click", function () {
        const isExpanded = tr.dataset.expanded === "true";

        // Close all other expanded rows
        document
          .querySelectorAll('tr[data-expanded="true"]')
          .forEach(function (expandedRow) {
            if (expandedRow !== tr) {
              const otherDetails =
                expandedRow.querySelector(".details-content");
              if (otherDetails) {
                otherDetails.style.display = "none";
              }
              expandedRow.dataset.expanded = "false";
            }
          });

        if (isExpanded) {
          // Collapse
          detailsDiv.style.display = "none";
          tr.dataset.expanded = "false";
        } else {
          // Expand
          detailsDiv.style.display = "block";
          tr.dataset.expanded = "true";
        }
      });

      return tr;
    });
    tbody.append(...rows);
  }
);
