const request = require('supertest')
const jwt = require('jwt-simple')
const app = require('../../src/app')

const MAIN_ROUTE = '/v1/accounts'
let user
let user2

beforeAll(async () => {
  const res = await app.services.user.save({ name: 'User account', mail: `${Date.now()}@mail.com`, password: '123456' })
  user = { ...res[0] }
  user.token = jwt.encode(user, 'Segredo!')
  const res2 = await app.services.user.save({ name: 'User account #2', mail: `${Date.now()}@mail.com`, password: '123456' })
  user2 = { ...res2[0] }
})

test('Deve inserir uma conta com sucesso', () => {
  return request(app).post(MAIN_ROUTE)
    .send({ name: 'Acc #1' })
    .set('authorization', `bearer ${user.token}`)
    .then((result) => {
      expect(result.status).toBe(201)
      expect(result.body.name).toBe('Acc #1')
    })
})

test('Não deve inserir uma conta sem nome', () => {
  return request(app).post(MAIN_ROUTE)
    .send({ })
    .set('authorization', `bearer ${user.token}`)
    .then((result) => {
      expect(result.status).toBe(400)
      expect(result.body.error).toBe('Nome é um atributo obrigatório')
    })
})

test('Não deve inserir uma conta de nome duplicado para o mesmo usuário', () => {
  return app.db('accounts').insert({ name: 'Acc duplicada', user_Id: user.id })
    .then(() => request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${user.token}`)
      .send({ name: 'Acc duplicada' }))
    .then((res) => {
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Já existe uma conta com esse nome')
    })
})

test('Deve listar apenas as contas do usuário', async () => {
  await app.db('Transactions').del()
  await app.db('accounts').del()
  return app.db('accounts').insert([
    { name: 'Acc User #1', user_Id: user.id },
    { name: 'Acc User #2', user_Id: user2.id }
  ]).then(() => request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].name).toBe('Acc User #1')
    }))
})

test('Deve retornar uma conta por Id', () => {
  return app.db('accounts')
    .insert({ name: 'Acc by Id', user_Id: user.id }, ['id'])
    .then(acc => request(app).get(`${MAIN_ROUTE}/${acc[0].id}`)
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Acc by Id')
      expect(res.body.user_Id).toBe(user.id)
    })
})

test('Não deve retornar uma conta de outro usuário', () => {
  return app.db('accounts')
    .insert({ name: 'Acc user #2', user_Id: user2.id }, ['id'])
    .then(acc => request(app).get(`${MAIN_ROUTE}/${acc[0].id}`)
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Este recurso não pertence ao usuário')
    })
})

test('Deve alterar uma conta', () => {
  return app.db('accounts')
    .insert({ name: 'Acc To Update', user_Id: user.id }, ['id'])
    .then(acc => request(app).put(`${MAIN_ROUTE}/${acc[0].id}`)
      .send({ name: 'Acc Updated' })
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Acc Updated')
    })
})

test('Não deve alterar uma conta de outro usuário', () => {
  return app.db('accounts')
    .insert({ name: 'Acc user #2', user_Id: user2.id }, ['id'])
    .then(acc => request(app).put(`${MAIN_ROUTE}/${acc[0].id}`)
      .send({ name: 'Acc Updated' })
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Este recurso não pertence ao usuário')
    })
})

test('Deve remover uma conta', () => {
  return app.db('accounts')
    .insert({ name: 'Acc To Remove', user_Id: user.id }, ['id'])
    .then(acc => request(app).delete(`${MAIN_ROUTE}/${acc[0].id}`)
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(204)
    })
})

test('Não deve remover uma conta de outro usuário', () => {
  return app.db('accounts')
    .insert({ name: 'Acc user #2', user_Id: user2.id }, ['id'])
    .then(acc => request(app).delete(`${MAIN_ROUTE}/${acc[0].id}`)
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Este recurso não pertence ao usuário')
    })
})
