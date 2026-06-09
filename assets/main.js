/* radlinsky.com.ua rebuild — shared scripts */

// Mobile menu toggle
document.addEventListener('click', function (e) {
  var burger = e.target.closest('.burger');
  if (burger) {
    var nav = document.querySelector('.main-nav');
    if (nav) nav.classList.toggle('open');
  }
});

/* Registration form handling.
   Currently the form does NOT yet send anywhere — it only shows the success
   message, exactly like the original site's confirmation text.

   TO ENABLE EMAIL DELIVERY (next step):
   1) Create a free endpoint at web3forms.com (or formspree.io).
   2) Put the access key in the hidden "access_key" field below, OR set
      form.action to the Formspree URL.
   3) Uncomment the fetch() block — заявки начнут приходить на почту
      nickolay@radlinsky.com.ua. The hidden "course" field tells you which
      course/date the lead registered for. */
document.querySelectorAll('form.js-reg').forEach(function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var success = form.parentElement.querySelector('.form-success');

    /* ---- enable when an endpoint is configured ----
    var data = new FormData(form);
    fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function () { form.reset(); if (success) success.style.display = 'block'; })
      .catch(function () { alert('Не вдалося відправити. Спробуйте пізніше.'); });
    return;
    ------------------------------------------------- */

    // temporary behaviour: just confirm visually
    form.reset();
    if (success) success.style.display = 'block';
  });
});
