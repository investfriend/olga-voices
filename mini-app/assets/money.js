/* assets/money.js v1 — entry card for «Мои деньги» */
(function () {
  'use strict';

  var _WALLET = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,72H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,64V192a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H56a8,8,0,0,1,0-16H216Zm0-32H56V88H216Zm-28-36a12,12,0,1,1-12-12A12,12,0,0,1,188,132Z"/></svg>';
  var _CARET  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>';

  function renderMoneyCard() {
    var el = document.getElementById('hp-money');
    if (!el) return;
    el.innerHTML =
      '<button class="mn-home-card" type="button" aria-label="Перейти в раздел Мои деньги">'
      + '<span class="mn-home-ic" aria-hidden="true">' + _WALLET + '</span>'
      + '<span class="mn-home-body">'
      + '<span class="mn-home-title">Мои деньги</span>'
      + '<span class="mn-home-desc">Доходы, расходы, цели и личный финансовый план</span>'
      + '</span>'
      + '<span class="mn-home-arr" aria-hidden="true">' + _CARET + '</span>'
      + '</button>';
    el.querySelector('.mn-home-card').addEventListener('click', function () {
      if (window.setPage) setPage('money');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMoneyCard);
  } else {
    renderMoneyCard();
  }
}());
