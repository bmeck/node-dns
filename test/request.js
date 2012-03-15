var dns = require('../dns'),
  Request = dns.Request,
  Question = dns.Question,
  consts = dns.consts,
  dgram = require('dgram'),
  TypeMap = require('../lib/types');

var q = Question({
  name: 'www.google.com',
  type: consts.NAME_TO_QTYPE.A,
});

var noServer = {
  address: '127.0.0.1',
  port: 19999,
  type: 'udp',
};

var udpServ = {
  address: '8.8.8.8',
  port: 53,
  type: 'udp',
};

var tcpServ = {
  address: '8.8.8.8',
  port: 53,
  type: 'tcp',
};

exports.setUp = function (cb) {
  cb();
};

exports.timeout = function (test) {
  var r = Request({
    question: q,
    server: noServer,
    timeout: 100,
  });

  var timedout = false;

  r.on('timeout', function () {
    timedout = true;
  });

  r.on('end', function () {
    test.ok(timedout, 'Failed to timeout');
    test.done();
  });

  r.send();
};

exports.udpResponse = function (test) {
  var r = Request({
    question: q,
    server: udpServ,
    timeout: 4000,
  });

  r.on('message', function (err, answer) {
    test.ok(!err, 'UDP Request should not error');
    test.ok(answer, 'No UDP answer provided');
    test.ok(answer.answer.length > 0, 'No answers found');
  });

  r.on('timeout', function () {
    test.ok(false, 'UDP Requests should not timeout');
  });

  r.on('end', function () {
    test.done();
  });

  r.send();
};

exports.tcpResponse = function (test) {
  var r = Request({
    question: q,
    server: tcpServ,
    timeout: 4000,
  });

  r.on('message', function (err, answer) {
    test.ok(!err, 'TCP Request should not error');
    test.ok(answer, 'No TCP answer provided');
    test.ok(answer.answer.length > 0, 'No answers found');
  });

  r.on('timeout', function () {
    test.ok(false, 'TCP Requests should not timeout');
  });

  r.on('end', function () {
    test.done();
  });

  r.send();
};

exports.autoPromote = function (test) {
  var r = Request({
    question: q,
    server: udpServ,
    timeout: 4000,
  });

  var PendingRequests = require('../lib/pending');
  PendingRequests.autopromote = true;

  r.on('message', function (err, answer) {

    test.ok(answer.answer.length > 0, 'no answers found');

    answer.answer.forEach(function (a) {
      test.ok(a instanceof TypeMap.fromQtype(a.type), 'Not an instance of derived type');
    });
  });

  r.on('timeout', function () {
    test.ok(false, 'Should not timeout');
  });

  r.on('end', function () {
    PendingRequests.autopromote = false;
    test.done();
  });

  r.send();
};

exports.noPromote = function (test) {
  var r = Request({
    question: q,
    server: udpServ,
    timeout: 4000,
  });

  r.on('message', function (err, answer) {

    test.ok(answer.answer.length > 0, 'no answers found');

    answer.answer.forEach(function (a) {
      test.ok(!(a instanceof TypeMap.fromQtype(a.type)), 'Record an instance of derived type');
    });
  });

  r.on('timeout', function () {
    test.ok(false, 'Should not timeout');
  });

  r.on('end', function () {
    test.done();
  });

  r.send();
};

exports.serverString = function (test) {
  var r = Request({
    question: q,
    server: '8.8.8.8',
  });

  r.on('message', function (err, answer) {
    test.ok(answer.answer.length > 0, 'no answers found');
  });

  r.on('timeout', function () {
    test.ok(false, 'Should not timeout');
  });

  r.on('end', function () {
    test.done();
  });

  r.send();
};

exports.questionString = function (test) {
  var r = Request({
    question: Question({
      name: 'www.google.com',
      type: 'a',
    }),
    server: '8.8.8.8',
  });

  r.on('message', function (err, answer) {
    test.ok(answer.answer.length > 0, 'no answers found');
  });

  r.on('timeout', function () {
    test.ok(false, 'Should not timeout');
  });

  r.on('end', function () {
    test.done();
  });

  r.send();
};

exports.emptyUdp = function (test) {
  var socket = dgram.createSocket('udp4');
  socket.on('listening', function () {
    var timeout = false;
    var r = Request({
      question: q,
      server: { address: '127.0.0.1', port: socket.address().port, type: 'udp' },
      timeout: 300,
    });
    r.on('message', function () {
      test.ok(false, 'There should not be a response');
    });
    r.on('timeout', function () {
      timeout = true;
    });
    r.on('end', function () {
      test.ok(timeout, 'This should timeout');
      socket.close();
      test.done();
    });
    r.send();
  });
  socket.on('message', function (msg, remote) {
    socket.send(new Buffer(1), 0, 1, remote.port, remote.address);
  });
  socket.bind();
};

exports.tearDown = function (cb) {
  cb();
};