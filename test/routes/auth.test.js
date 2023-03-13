const request = require('supertest')
const app = require('../../src/app')

test('Deve receber token ao logar', () => {
  const mail = `${Date.now()}@mail.com`
  return app.services.user.save(
    { name: 'Walter', mail, password: '123456' })
    .then(() => request(app).post('/auth/signin'))
    .send({ mail, password: '123456' })
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('token')
    })
})

test('Não deve autenticar usuário com senha errada', () => {
  const mail = `${Date.now()}@mail.com`
  return app.services.user.save(
    { name: 'Walter', mail, password: '123456' })
    .then(() => request(app).post('/auth/signin'))
    .send({ mail, password: '654321' })
    .then((res) => {
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Usuário ou senha inválido')
    })
})

test('Não deve autenticar usuário com senha errada', () => {
  return request(app).post('/auth/signin')
    .send({ mail: 'naoexiste@mail.com', password: '654321' })
    .then((res) => {
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Usuário ou senha inválido')
    })
})

test('Não deve acessar uma rota protegida sem token', () => {
  return request(app).get('/users')
    .then((res) => {
      expect(res.status).toBe(401)
    })
})
