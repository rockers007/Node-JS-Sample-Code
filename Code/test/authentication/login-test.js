var http = require('http');
var assert = require('assert');
const request = require('request');
var server = require('../../server');
var expect = require('chai').expect;

var port = 3000;
let URL = 'http://localhost:' + port + '/api/v1';
let LOGIN_API_URL = URL + '/users/login?lng=en';

describe('LOGIN MODULE', function () {
  before(function () {});
  after(function () {});

  describe('/POST Login', function () {
    it('should send validation error for blank all fields in login', function (done) {
      request.post(
        LOGIN_API_URL,
        {
          json: {
            email: '',
            password: '',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(400);
          done();
        }
      );
    });

    it('should send validation error for unauthorized user in login', function (done) {
      request.post(
        LOGIN_API_URL,
        {
          json: {
            email: 'test@mailinator.com',
            password: 'Rockers1234',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(401);
          expect(body.message).to.equal('Incorrect email or password');
          done();
        }
      );
    });

    it('should send validation error for password with only number and text', function (done) {
      request.post(
        LOGIN_API_URL,
        {
          json: {
            email: 'test@mailinator.com',
            password: 'Rockers@1234',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(400);
          expect(body.errors[0].msg).to.equal(
            'Please enter a password with only number and text.'
          );
          done();
        }
      );
    });

    it('should do user Login', function (done) {
      request.post(
        LOGIN_API_URL,
        {
          json: {
            email: 'rahul17.rockersinfo@gmail.com',
            password: 'Rockers1234',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(200);
          expect(body.status).to.equal('success');
          done();
        }
      );
    });
  });
});
