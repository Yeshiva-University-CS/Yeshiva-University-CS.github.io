for (let h of document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')) {
    h.innerHTML += ` <a class="header-link" href="#${h.id}" aria-hidden="true">#</a>`;
}
