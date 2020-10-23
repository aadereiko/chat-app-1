const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-template')
  .innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // new msg element
  const $newMsg = $messages.lastElementChild;

  // height of the new message
  const newMsgStyles = getComputedStyle($newMsg);
  const newMsgMargin = parseInt(newMsgStyles.marginBottom);
  const newMsgHeight = $newMsg.offsetHeight + newMsgMargin;

  // visible height
  const visibleHeight = $messages.offsetHeight;

  // height of messages
  const containerHeight = $messages.scrollHeight;

  // how far have i scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMsgHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }

  console.log(newMsgMargin);
};

socket.on('message', (msg) => {
  console.log(msg);
  const html = Mustache.render(messageTemplate, {
    username: msg.username,
    msg: msg.text,
    createdAt: moment(msg.createdAt).format('hh:mm:ss'),
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on('locationMessage', (loc) => {
  const html = Mustache.render(locationMessageTemplate, {
    url: loc.url,
    createdAt: moment(loc.createdAt).format('hh:mm:ss'),
    username: loc.username,
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  $sidebar.innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (e.target.elements.message.value) {
    $messageFormButton.setAttribute('disabled', 'disabled');
    // disabled
    socket.emit('sendMessage', e.target.elements.message.value, (error) => {
      $messageFormButton.removeAttribute('disabled');
      $messageFormInput.value = '';
      $messageFormInput.focus();

      // enable
      if (error) {
        return console.log(error);
      }

      console.log('Message delivered');
    });
  }
});

$sendLocationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser');
  }

  navigator.geolocation.getCurrentPosition((position) => {
    $sendLocationButton.setAttribute('disabled', 'disabled');

    socket.emit(
      'sendLocation',
      {
        lng: position.coords.longitude,
        lat: position.coords.latitude,
      },
      (error) => {
        $sendLocationButton.removeAttribute('disabled');

        if (error) {
          return console.log(error);
        }
      }
    );
  });
});

socket.emit('join', { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = '/';
  }
});
