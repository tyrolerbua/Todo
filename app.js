const boardEl = document.getElementById('board');
const addListBtn = document.getElementById('add-list-btn');
const listTemplate = document.getElementById('list-template');
const cardTemplate = document.getElementById('card-template');

const STORAGE_KEY = 'trello_like_board_v1';

let state = loadState();
let dragPayload = null;

render();

addListBtn.addEventListener('click', () => {
  state.lists.push({ id: uid(), title: 'Neue Liste', cards: [] });
  persistAndRender();
});

function defaultState() {
  return {
    lists: [
      {
        id: uid(),
        title: 'To Do',
        cards: [{ id: uid(), text: 'Erste Aufgabe' }],
      },
      { id: uid(), title: 'Doing', cards: [] },
      { id: uid(), title: 'Done', cards: [] },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  boardEl.innerHTML = '';

  state.lists.forEach((list) => {
    const listNode = listTemplate.content.firstElementChild.cloneNode(true);
    listNode.dataset.listId = list.id;

    const titleInput = listNode.querySelector('.list-title');
    const deleteListBtn = listNode.querySelector('.delete-list');
    const cardsEl = listNode.querySelector('.cards');
    const addCardForm = listNode.querySelector('.add-card-form');
    const newCardInput = listNode.querySelector('.new-card-input');

    titleInput.value = list.title;
    titleInput.addEventListener('change', (e) => {
      list.title = e.target.value.trim() || 'Unbenannte Liste';
      persistAndRender();
    });

    deleteListBtn.addEventListener('click', () => {
      state.lists = state.lists.filter((l) => l.id !== list.id);
      persistAndRender();
    });

    addCardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = newCardInput.value.trim();
      if (!text) return;
      list.cards.push({ id: uid(), text });
      persistAndRender();
    });

    list.cards.forEach((card) => {
      const cardNode = cardTemplate.content.firstElementChild.cloneNode(true);
      cardNode.dataset.cardId = card.id;
      cardNode.dataset.listId = list.id;

      const cardText = cardNode.querySelector('.card-text');
      const deleteCardBtn = cardNode.querySelector('.delete-card');

      cardText.value = card.text;
      cardText.addEventListener('change', (e) => {
        card.text = e.target.value;
        persistAndRender();
      });

      deleteCardBtn.addEventListener('click', () => {
        list.cards = list.cards.filter((c) => c.id !== card.id);
        persistAndRender();
      });

      attachCardDnD(cardNode, cardsEl);
      cardsEl.appendChild(cardNode);
    });

    attachListDnD(listNode);
    attachCardContainerDnD(cardsEl, list.id);

    boardEl.appendChild(listNode);
  });
}

function attachListDnD(listNode) {
  listNode.addEventListener('dragstart', () => {
    dragPayload = { type: 'list', listId: listNode.dataset.listId };
    listNode.classList.add('dragging');
  });

  listNode.addEventListener('dragend', () => {
    listNode.classList.remove('dragging');
    dragPayload = null;
  });

  listNode.addEventListener('dragover', (e) => {
    if (dragPayload?.type !== 'list') return;
    e.preventDefault();
    listNode.classList.add('drop-target');
  });

  listNode.addEventListener('dragleave', () => listNode.classList.remove('drop-target'));

  listNode.addEventListener('drop', () => {
    listNode.classList.remove('drop-target');
    if (dragPayload?.type !== 'list') return;

    const from = state.lists.findIndex((l) => l.id === dragPayload.listId);
    const to = state.lists.findIndex((l) => l.id === listNode.dataset.listId);
    if (from < 0 || to < 0 || from === to) return;

    const [moved] = state.lists.splice(from, 1);
    state.lists.splice(to, 0, moved);
    persistAndRender();
  });
}

function attachCardDnD(cardNode, cardsEl) {
  cardNode.addEventListener('dragstart', () => {
    dragPayload = {
      type: 'card',
      cardId: cardNode.dataset.cardId,
      fromListId: cardNode.dataset.listId,
    };
    cardNode.classList.add('dragging');
  });

  cardNode.addEventListener('dragend', () => {
    cardNode.classList.remove('dragging');
  });

  cardNode.addEventListener('dragover', (e) => {
    if (dragPayload?.type !== 'card') return;
    e.preventDefault();
    cardsEl.classList.add('drop-target');
  });

  cardNode.addEventListener('drop', (e) => {
    e.preventDefault();
    cardsEl.classList.remove('drop-target');
    if (dragPayload?.type !== 'card') return;

    const targetListId = cardNode.dataset.listId;
    moveCard(dragPayload.fromListId, targetListId, dragPayload.cardId, cardNode.dataset.cardId);
  });
}

function attachCardContainerDnD(cardsEl, listId) {
  cardsEl.addEventListener('dragover', (e) => {
    if (dragPayload?.type !== 'card') return;
    e.preventDefault();
    cardsEl.classList.add('drop-target');
  });

  cardsEl.addEventListener('dragleave', () => cardsEl.classList.remove('drop-target'));

  cardsEl.addEventListener('drop', (e) => {
    e.preventDefault();
    cardsEl.classList.remove('drop-target');
    if (dragPayload?.type !== 'card') return;

    moveCard(dragPayload.fromListId, listId, dragPayload.cardId);
  });
}

function moveCard(fromListId, toListId, cardId, beforeCardId = null) {
  const fromList = state.lists.find((l) => l.id === fromListId);
  const toList = state.lists.find((l) => l.id === toListId);
  if (!fromList || !toList) return;

  const fromIndex = fromList.cards.findIndex((c) => c.id === cardId);
  if (fromIndex < 0) return;

  const [movedCard] = fromList.cards.splice(fromIndex, 1);

  if (!beforeCardId) {
    toList.cards.push(movedCard);
  } else {
    const insertIndex = toList.cards.findIndex((c) => c.id === beforeCardId);
    if (insertIndex < 0) {
      toList.cards.push(movedCard);
    } else {
      toList.cards.splice(insertIndex, 0, movedCard);
    }
  }

  persistAndRender();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
