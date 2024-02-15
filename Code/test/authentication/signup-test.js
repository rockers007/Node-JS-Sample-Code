var http = require('http');
var assert = require('assert');
const request = require('request');
var server = require('../../server');
var expect = require('chai').expect;

var port = 3000;
let URL = 'http://localhost:' + port + '/api/v1';

let SIGNUP_API_URL = URL + '/users/signup?lng=en';

describe('REGISTRATION MODULE', function () {
  before(function () {});
  after(function () {});

  describe('/POST Register', function () {
    it('should send validation error for blank all fields in signup', function (done) {
      request.post(
        SIGNUP_API_URL,
        {
          json: {
            firstName: 'Test User',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(400);
          done();
        }
      );
    });

    it('should send validation error for E-mail exists already', function (done) {
      request.post(
        SIGNUP_API_URL,
        {
          json: {
            firstName: 'Rahul',
            lastName: 'Shimpi',
            email: 'rahul17.rockersinfo@gmail.com',
            password: 'Rockers1234',
            passwordConfirm: 'Rockers1234',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(400);
          expect(body.errors[0].msg).to.equal(
            'E-mail exists already, please pick a diffrent one.'
          );
          done();
        }
      );
    });

    it('should send validation error for password confirmation does not match password', function (done) {
      request.post(
        SIGNUP_API_URL,
        {
          json: {
            firstName: 'Rahul',
            lastName: 'Shimpi',
            email: 'test.rockersinfo@gmail.com',
            password: 'Rockers1234',
            passwordConfirm: 'Rockers12345',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(400);
          expect(body.errors[0].msg).to.equal(
            'Password confirmation does not match password.'
          );
          done();
        }
      );
    });

    it('should send valid register user', function (done) {
      request.post(
        SIGNUP_API_URL,
        {
          json: {
            firstName: 'Rahul',
            lastName: 'Shimpi',
            email: 'test.rockersinfo@gmail.com',
            password: 'Rockers1234',
            passwordConfirm: 'Rockers1234',
          },
        },
        (error, res, body) => {
          expect(res.statusCode).to.equal(201);
          done();
        }
      );
    });
  });
});
