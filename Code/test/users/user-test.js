var http = require('http');
var assert = require('assert');
const request = require('request');
var server = require('../../server');
var expect = require('chai').expect;
let chai = require('chai');
let should = chai.should();
let chaiHttp = require('chai-http');

chai.use(chaiHttp);

var port = 3000;
let URL = 'http://localhost:' + port + '/api/v1';
let LOGIN_API_URL = URL + '/users/login?lng=en';
let CURRENT_USER_API = '/users/me';

describe('USER CURRENT PROFILE AND CHANGE PASSWORD MODULE', function () {
  before(function () {});
  after(function () {});

  // Prepare data for testing
  const userTestData = {
    email: 'test.rockersinfo@gmail.com',
    password: 'Rockers1234',
  };

  it('should do user Login', function (done) {
    request.post(
      LOGIN_API_URL,
      {
        json: userTestData,
      },
      (error, res, body) => {
        expect(res.statusCode).to.equal(200);
        expect(body.status).to.equal('success');
        userTestData.token = res.body.token;
        done();
      }
    );
  });

  it('should GET current user profile', function (done) {
    chai
      .request(URL)
      .get(CURRENT_USER_API)
      .set('Authorization', 'Bearer ' + userTestData.token)
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        done();
      });
  });
});
