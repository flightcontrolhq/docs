/**
 * Session replay for authenticated users only.
 *
 * Mintlify's PostHog integration runs analytics with `sessionRecording: false` and does not
 * expose its PostHog instance, so replay runs in a second, named instance that reuses the
 * distinct ID and session ID from the analytics instance's cookie. That keeps recordings
 * attached to the same PostHog session as the docs pageviews.
 */
(function () {
  var PROJECT_KEY = "phc_knvqBBWDUykLHBQFmz9spqtcuvWnkupHeVcxqFF2K977";
  var API_HOST = "https://api.ravion.com/i";
  var AUTH_COOKIE = "rps";
  var INSTANCE_NAME = "docsReplay";
  var COOKIE_POLL_INTERVAL_MS = 500;
  var COOKIE_POLL_TIMEOUT_MS = 15000;
  var AUTH_POLL_INTERVAL_MS = 30000;

  function cookieValue(name) {
    var prefix = name + "=";
    var match = document.cookie.split(";").find(function (cookie) {
      return cookie.trim().indexOf(prefix) === 0;
    });
    if (!match) return undefined;
    return decodeURIComponent(match.trim().slice(prefix.length));
  }

  function isLoggedIn() {
    return cookieValue(AUTH_COOKIE) !== undefined;
  }

  function analyticsIdentity() {
    var raw = cookieValue("ph_" + PROJECT_KEY + "_posthog");
    if (!raw) return undefined;
    try {
      var parsed = JSON.parse(raw);
      var session = parsed.$sesid;
      return {
        distinctID: parsed.distinct_id,
        sessionID: Array.isArray(session) ? session[1] : undefined,
      };
    } catch (error) {
      return undefined;
    }
  }

  function waitForAnalyticsIdentity() {
    return new Promise(function (resolve) {
      var identity = analyticsIdentity();
      if (identity && identity.distinctID) {
        resolve(identity);
        return;
      }

      var elapsed = 0;
      var timer = setInterval(function () {
        elapsed += COOKIE_POLL_INTERVAL_MS;
        var next = analyticsIdentity();
        if ((next && next.distinctID) || elapsed >= COOKIE_POLL_TIMEOUT_MS) {
          clearInterval(timer);
          resolve(next);
        }
      }, COOKIE_POLL_INTERVAL_MS);
    });
  }

  var snippetPromise;

  function loadSnippet() {
    snippetPromise ??= new Promise(function (resolve, reject) {
      if (window.posthog && typeof window.posthog.init === "function") {
        resolve(window.posthog);
        return;
      }
      var script = document.createElement("script");
      script.src = API_HOST + "/static/array.js";
      script.async = true;
      script.onload = function () {
        resolve(window.posthog);
      };
      script.onerror = function () {
        snippetPromise = undefined;
        reject(new Error("Failed to load PostHog"));
      };
      document.head.appendChild(script);
    });
    return snippetPromise;
  }

  var replayInstance;
  var starting = false;

  function startReplay() {
    if (replayInstance || starting) {
      if (replayInstance && !replayInstance.sessionRecordingStarted()) {
        replayInstance.startSessionRecording();
      }
      return;
    }
    starting = true;

    Promise.all([loadSnippet(), waitForAnalyticsIdentity()])
      .then(function (results) {
        var posthog = results[0];
        var identity = results[1];
        if (!posthog || !isLoggedIn()) return;

        replayInstance = posthog.init(
          PROJECT_KEY,
          {
            api_host: API_HOST,
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            capture_exceptions: false,
            capture_dead_clicks: false,
            capture_heatmaps: false,
            capture_performance: {network_timing: true, web_vitals: false},
            disable_surveys: true,
            disable_web_experiments: true,
            bootstrap: identity || {},
          },
          INSTANCE_NAME,
        );
      })
      .catch(function () {
        // Replay is best-effort; never break the docs page.
      })
      .finally(function () {
        starting = false;
      });
  }

  function syncReplayWithAuthState() {
    if (isLoggedIn()) {
      startReplay();
      return;
    }
    if (replayInstance && replayInstance.sessionRecordingStarted()) {
      replayInstance.stopSessionRecording();
    }
  }

  syncReplayWithAuthState();
  setInterval(syncReplayWithAuthState, AUTH_POLL_INTERVAL_MS);
})();
