$(function () {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('#account'); // Input for Account
  var $userPasswordInput = $('#password'); // Input for Account
  var $nicknameInput = $('#nickname'); //
  var $registerAccount = $("#registerAccount");
  var $registerPassword = $("#registerPassword");
  var $checkoutPassword = $("#checkoutPassword");
  var $referenceAccount = $("#referenceAccount");
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $actionMessage = $('.inputAction'); // 
  var $givePoints = $('.inputPoints'); // 

  var $registerPage = $('.register.page'); // The register page  
  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  var $submit = $("#submit");
  var $registerSubmit = $("#registerSubmit");
  var $showRegister = $("#showRegister");
  var $actionSubmit = $("#actionSubmit");

  // Prompt for setting a username
  var username;
  var nickname;
  var success;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  function addParticipantsMessage(data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "目前有 1 人一同觀賞";
    } else {
      message += "目前有 " + data.numUsers + " 人一同觀賞";
    }
    log(message);
  }

  // register User

  function registerUser() {
    var username = cleanInput($registerAccount.val().trim());
    var nickname = cleanInput($nicknameInput.val().trim());
    var userPassword = cleanInput($registerPassword.val().trim());
    var checkoutPassword = cleanInput($checkoutPassword.val().trim());
    var referenceAccount = cleanInput($referenceAccount.val().trim());
    if (username.length < 6) {
      alert("帳號過短")
    }
    if (userPassword.length < 8) {
      alert("密碼過短")
    }
    if (username && userPassword && userPassword === checkoutPassword) {
      $.ajax({
        method: "POST",
        url: "http://52.229.170.236/api/register",
        data: { username: username, password: userPassword, nickname: nickname }
      }).done(function (msg) {
        $registerPage.fadeOut();
        $loginPage.fadeIn();
      }).fail(function (msg) {
        alert("register fail")
      });
    } else {
      alert("請確認密碼相同")
    }
  }

  // Sets the client's username
  function setUsername() {
    username = cleanInput($usernameInput.val().trim());
    userPassword = cleanInput($userPasswordInput.val().trim());

    // If the username is valid
    if (username && userPassword) {
      $.ajax({
        method: "POST",
        url: "http://52.229.170.236/api/login",
        data: { username: username, password: userPassword }
      }).done(function (msg) {
        $loginPage.fadeOut();
        $loginPage.off('click');
        $chatPage.fadeIn();
        nickname = msg.nickname;
        socket.emit('add user', nickname);
        // $currentInput = $inputMessage.focus();
        // Tell the server your username
        success = true
      }).fail(function (msg) {
        alert("login fail")
      });
    }
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: nickname,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  function sendActionMessage() {
    var ActionMessage = $actionMessage.val();
    var givePoints = $givePoints.val();
    message = cleanInput(ActionMessage);
    if (message && givePoints && connected) {
      $actionMessage.val("");
      $givePoints.val("");
      addChatMessage({
        username: username,
        message: "指定完成動作 " + message + "，給" + givePoints + "點數"
      });
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    damoo.emit({ text: data.message, color: "#" + Math.random().toString(16).substring(2).substring(0, 6) });

    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      // $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (success) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function () {
    updateTyping();
  });

  // $loginPage.fadeOut();
  $chatPage.fadeOut();
  $registerPage.fadeOut();

  // Click events

  // Focus input when clicking anywhere on login page
  // $loginPage.click(function () {
  //   $currentInput.focus();
  // });

  $submit.click(function () {
    setUsername();
  })

  $showRegister.click(function () {
    $registerPage.fadeIn();
    $loginPage.fadeOut();
  })

  $registerSubmit.click(function () {
    registerUser();
  })

  $actionSubmit.click(function () {
    sendActionMessage();
  })

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    // $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    createDmScreen();
    connected = true;
    // Display the welcome message
    var message = "歡迎來到此秀場 – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
    $("#dm-main").one("click", function () { player.playVideo() });
    player.playVideo();
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' 加入了秀場');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' 離開了秀場');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

});
