(function () {
  "use strict";
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function preferredTheme() {
    try {
      var saved = localStorage.getItem("wpu-goa-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (error) {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggle) {
      var next = theme === "dark" ? "light" : "dark";
      toggle.setAttribute("aria-label", "Switch to " + next + " mode");
      toggle.setAttribute("title", "Switch to " + next + " mode");
      toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }

  setTheme(preferredTheme());
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem("wpu-goa-theme", next); } catch (error) {}
      setTheme(next);
    });
  }

  var archiveButton = document.querySelector("[data-archive-more]");
  var archiveGrid = document.querySelector("[data-archive-grid]");
  if (archiveButton && archiveGrid) {
    archiveButton.addEventListener("click", function () {
      var hidden = Array.prototype.slice.call(
        archiveGrid.querySelectorAll(".archive-item[hidden]")
      );
      hidden.slice(0, 12).forEach(function (item) {
        item.hidden = false;
      });
      var remaining = archiveGrid.querySelectorAll(".archive-item[hidden]").length;
      if (remaining === 0) {
        archiveButton.closest(".archive-controls").hidden = true;
      } else {
        archiveButton.textContent = "Show 12 more";
        archiveButton.setAttribute(
          "aria-label",
          "Show 12 more archive items; " + remaining + " remain"
        );
      }
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-latest-rail]"),
    function (rail) {
      var track = rail.querySelector("[data-latest-track]");
      var previous = rail.querySelector("[data-latest-previous]");
      var next = rail.querySelector("[data-latest-next]");
      if (!track || !previous || !next) return;

      function updateRailControls() {
        var maximum = Math.max(0, track.scrollWidth - track.clientWidth);
        previous.disabled = track.scrollLeft <= 4;
        next.disabled = track.scrollLeft >= maximum - 4;
      }

      function moveRail(direction) {
        var firstCard = track.querySelector(".latest-card");
        var distance = firstCard
          ? firstCard.getBoundingClientRect().width + 16
          : track.clientWidth * 0.8;
        track.scrollBy({
          left: distance * direction,
          behavior: reducedMotion.matches ? "auto" : "smooth"
        });
      }

      previous.addEventListener("click", function () { moveRail(-1); });
      next.addEventListener("click", function () { moveRail(1); });
      track.addEventListener("scroll", updateRailControls, { passive: true });
      window.addEventListener("resize", updateRailControls);
      updateRailControls();
    }
  );

  Array.prototype.forEach.call(
    document.querySelectorAll(".evidence-gallery"),
    function (gallery) {
      var figures = Array.prototype.slice.call(gallery.querySelectorAll("figure"));
      var images = figures.map(function (figure) {
        return figure.querySelector("img");
      }).filter(Boolean);
      if (!images.length) return;

      var dialog = document.createElement("dialog");
      dialog.className = "gallery-dialog";
      dialog.setAttribute(
        "aria-label",
        gallery.getAttribute("aria-label") || "Image gallery"
      );

      var inner = document.createElement("div");
      inner.className = "gallery-dialog-inner";
      var previous = document.createElement("button");
      previous.className = "gallery-dialog-previous";
      previous.type = "button";
      previous.setAttribute("aria-label", "Previous image");
      previous.textContent = "‹";
      var display = document.createElement("figure");
      var displayImage = document.createElement("img");
      var caption = document.createElement("figcaption");
      display.append(displayImage, caption);
      var next = document.createElement("button");
      next.className = "gallery-dialog-next";
      next.type = "button";
      next.setAttribute("aria-label", "Next image");
      next.textContent = "›";
      var close = document.createElement("button");
      close.className = "gallery-dialog-close";
      close.type = "button";
      close.textContent = "Close";
      inner.append(previous, display, next, close);
      dialog.appendChild(inner);
      document.body.appendChild(dialog);

      var activeIndex = 0;
      var activeTrigger = null;

      function showImage(index) {
        activeIndex = (index + images.length) % images.length;
        var source = images[activeIndex];
        var sourceFigure = source.closest("figure");
        var sourceCaption = sourceFigure
          ? sourceFigure.querySelector("figcaption")
          : null;
        displayImage.src = source.currentSrc || source.src;
        displayImage.alt = source.alt;
        caption.textContent = sourceCaption ? sourceCaption.textContent : source.alt;
      }

      function openImage(index, trigger) {
        showImage(index);
        activeTrigger = trigger;
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          window.open(displayImage.src, "_blank", "noopener");
        }
      }

      images.forEach(function (image, index) {
        var trigger = document.createElement("button");
        trigger.className = "gallery-trigger";
        trigger.type = "button";
        trigger.setAttribute("aria-label", "Open image: " + image.alt);
        image.parentNode.insertBefore(trigger, image);
        trigger.appendChild(image);
        trigger.addEventListener("click", function () {
          openImage(index, trigger);
        });
      });

      previous.addEventListener("click", function () {
        showImage(activeIndex - 1);
      });
      next.addEventListener("click", function () {
        showImage(activeIndex + 1);
      });
      close.addEventListener("click", function () {
        dialog.close();
      });
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          dialog.close();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showImage(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          showImage(activeIndex + 1);
        }
      });
      dialog.addEventListener("close", function () {
        if (activeTrigger) activeTrigger.focus();
      });
    }
  );

  var form = document.querySelector("[data-search-form]");
  var input = document.querySelector("[data-search-input]");
  var results = document.querySelector("[data-search-results]");
  var status = document.querySelector("[data-search-status]");
  if (!form || !input || !results || !status) return;

  var records = [];
  function render(query) {
    var needle = query.trim().toLowerCase();
    results.replaceChildren();
    if (!needle) {
      status.textContent = "Enter a title, topic, programme, institute or event.";
      return;
    }
    var matched = records.filter(function (record) {
      return record.search_text.indexOf(needle) !== -1;
    }).slice(0, 40);
    status.textContent = matched.length + (matched.length === 1 ? " result" : " results");
    matched.forEach(function (record) {
      var article = document.createElement("article");
      article.className = "card";
      var small = document.createElement("small");
      small.textContent = record.category;
      var heading = document.createElement("h3");
      var link = document.createElement("a");
      link.href = record.route;
      link.textContent = record.title;
      heading.appendChild(link);
      var copy = document.createElement("p");
      copy.textContent = record.description;
      article.append(small, heading, copy);
      results.appendChild(article);
    });
  }

  fetch("/data/search-index.json")
    .then(function (response) {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    })
    .then(function (data) {
      records = data.records || [];
      var query = new URLSearchParams(window.location.search).get("q") || "";
      input.value = query;
      render(query);
    })
    .catch(function () {
      status.textContent = "Search is temporarily unavailable. Browse the site index instead.";
    });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = input.value.trim();
    var url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    history.replaceState({}, "", url);
    render(query);
  });
})();
