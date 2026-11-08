/*
 * ADHD Flow Widget — Heart mini-widget click handler
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 *
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/heart-open.js — heart.html click behavior.
   Externalized from heart.html so a strict `script-src 'self'` CSP can be used. */
'use strict';

function focusMainApp() {
    if (window.opener) {
        window.opener.focus();
    } else {
        window.open('index.html', '_blank');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', focusMainApp);
});
