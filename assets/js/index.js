for (let h of document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')) {
    h.innerHTML += ` <a class="header-link" href="#${h.id}" aria-hidden="true">#</a>`;
}


// $(function () {
//     return $("h2, h3, h4, h5, h6").each(function (i, el) {
//         var $el, icon, id;
//         $el = $(el);
//         id = $el.attr('id');
//         icon = '<i class="fa fa-link"></i>';
//         if (id) {
//             return $el.append($("<a />").addClass("header-link").attr("href", "#" + id).html(icon));
//         }
//     });
// });
