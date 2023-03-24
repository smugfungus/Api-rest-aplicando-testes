const request = require('supertest')
const app = require('../../src/app')

const MAIN_ROUTE = '/v1/transfers'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ii0xIiwibmFtZSI6IlVzZXIgIzEiLCJtYWlsIjoidXNlcjFAbWFpbC5jb20ifQ.Oh1XmbsMxSbsB9nzmhIXae1QP0lPyNC1EvMRBxrlfu8'

beforeAll(async () => {
// await app.db.migrate.rollback()
// await app.db.migrate.latest()
  await app.db.seed.run()
})

test('Deve listar apenas as transferências do usuário', () => {
  return request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].description).toBe('Transfer #1')
    })
})
