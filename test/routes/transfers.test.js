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

test('Deve inserir uma transferência com sucesso', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .send({ description: 'Regular transfer', user_id: -1, acc_ori_id: -1, acc_dest_id: -2, ammount: 100, date: new Date() })
    .then(async (res) => {
      expect(res.status).toBe(201)
      expect(res.body.description).toBe('Regular transfer')

      const transactions = await app.db('Transactions').where({ transfer_id: res.body.id })
      expect(transactions).toHaveLength(2)
      expect(transactions[0].description).toBe('Transfer to acc #-2')
      expect(transactions[1].description).toBe('Transfer from acc #-1')
      expect(transactions[0].ammount).toBe('-100.00')
      expect(transactions[1].ammount).toBe('100.00')
      expect(transactions[0].acc_id).toBe(-1)
      expect(transactions[1].acc_id).toBe(-2)
    })
})

describe('Ao salvar uma transferência válida...', () => {
  let transferId
  let income
  let outcome

  test('Deve retornar o status 201 e os dados da transferência', () => {
    return request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ description: 'Regular transfer', user_id: -1, acc_ori_id: -1, acc_dest_id: -2, ammount: 100, date: new Date() })
      .then(async (res) => {
        expect(res.status).toBe(201)
        expect(res.body.description).toBe('Regular transfer')
        transferId = res.body.id
      })
  })
  test('As transações equivalentes devem ser sido geradas', async () => {
    const transactions = await app.db('Transactions').where({ transfer_id: transferId }).orderBy('ammount')
    expect(transactions).toHaveLength(2)
    if (transactions) {
      [outcome, income] = transactions
    }
  })
  test('A transação de saida deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #-2')
    expect(outcome.ammount).toBe('-100.00')
    expect(outcome.acc_id).toBe(-1)
    expect(outcome.type).toBe('O')
  })
  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #-1')
    expect(income.ammount).toBe('100.00')
    expect(income.acc_id).toBe(-2)
    expect(outcome.type).toBe('I')
  })
  test('Ambas devem referenciar a transferência que a originou', () => {
    expect(income.transfer_id).toBe(transferId)
    expect(outcome.transfer_id).toBe(transferId)
  })
})

describe('Ao tentar salvar uma transferência inválida', () => {
  const validTransfer = { description: 'Regular transfer', user_id: -1, acc_ori_id: -1, acc_dest_id: -2, ammount: 100, date: new Date() }

  const template = (newData, errorMessage) => {
    return request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ ...validTransfer, ...newData })
      .then((res) => {
        expect(res.status).toBe(400)
        expect(res.body.error).toBe(errorMessage)
      })
  }
  test('Não deve inserir sem descrição', () => template({ description: null }, 'Descrição é um atributo obrigatório'))
  test('Não deve inserir sem valor', () => template({ ammount: null }, 'Valor é um atributo obrigatório'))
  test('Não deve inserir sem data', () => template({ date: null }, 'Data é um atributo obrigatório'))
  test('Não deve inserir sem conta de origem', () => template({ acc_ori_id: null }, 'Conta de origem é um atributo obrigatório'))
  test('Não deve inserir sem conta de destino', () => template({ acc_dest_id: null }, 'Conta de destino é um atributo obrigatório'))
  test('Não deve inserir se as contas de origem e destino forem as mesmas', () => template({ acc_dest_id: -1 }, 'Não é possivel transferir de uma conta para ela mesma'))
  test('Não deve inserir se as contas pertencerem a outro usuário', () => template({ acc_ori_id: -3 }, 'Conta #-3 não pertence ao usuário'))
})

test('Deve retornar uma transferência por Id', () => {
  return request(app).get(`${MAIN_ROUTE}/-1`)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.description).toBe('Transfer #1')
    })
})

describe('Ao alterar uma transferência válida...', () => {
  let transferId
  let income
  let outcome

  test('Deve retornar o status 200 e os dados da transferência', () => {
    return request(app).put(`${MAIN_ROUTE}/-1`)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ description: 'Transfer Updated', user_id: -1, acc_ori_id: -1, acc_dest_id: -2, ammount: 500, date: new Date() })
      .then(async (res) => {
        expect(res.status).toBe(200)
        expect(res.body.description).toBe('Transfer Updated')
        expect(res.body.ammount).toBe('500.00')
        transferId = res.body.id
      })
  })
  test('As transações equivalentes devem ser sido geradas', async () => {
    const transactions = await app.db('Transactions').where({ transfer_id: transferId }).orderBy('ammount')
    expect(transactions).toHaveLength(2)
    if (transactions) {
      [outcome, income] = transactions
    }
  })
  test('A transação de saida deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #-2')
    expect(outcome.ammount).toBe('-500.00')
    expect(outcome.acc_id).toBe(-1)
    expect(outcome.type).toBe('O')
  })
  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #-1')
    expect(income.ammount).toBe('500.00')
    expect(income.acc_id).toBe(-2)
    expect(outcome.type).toBe('I')
  })
  test('Ambas devem referenciar a transferência que a originou', () => {
    expect(income.transfer_id).toBe(transferId)
    expect(outcome.transfer_id).toBe(transferId)
  })
})

describe('Ao tentar alterar uma transferência inválida', () => {
  const validTransfer = { description: 'Regular transfer', user_id: -1, acc_ori_id: -1, acc_dest_id: -2, ammount: 100, date: new Date() }

  const template = (newData, errorMessage) => {
    return request(app).put(`${MAIN_ROUTE}/-1`)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ ...validTransfer, ...newData })
      .then((res) => {
        expect(res.status).toBe(400)
        expect(res.body.error).toBe(errorMessage)
      })
  }
  test('Não deve inserir sem descrição', () => template({ description: null }, 'Descrição é um atributo obrigatório'))
  test('Não deve inserir sem valor', () => template({ ammount: null }, 'Valor é um atributo obrigatório'))
  test('Não deve inserir sem data', () => template({ date: null }, 'Data é um atributo obrigatório'))
  test('Não deve inserir sem conta de origem', () => template({ acc_ori_id: null }, 'Conta de origem é um atributo obrigatório'))
  test('Não deve inserir sem conta de destino', () => template({ acc_dest_id: null }, 'Conta de destino é um atributo obrigatório'))
  test('Não deve inserir se as contas de origem e destino forem as mesmas', () => template({ acc_dest_id: -1 }, 'Não é possivel transferir de uma conta para ela mesma'))
  test('Não deve inserir se as contas pertencerem a outro usuário', () => template({ acc_ori_id: -3 }, 'Conta #-3 não pertence ao usuário'))
})

describe('Ao remover uma transferência', () => {
  test('Deve retornar o status 204', () => {
    return request(app).delete(`${MAIN_ROUTE}/-1`)
      .set('authorization', `bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(204)
      })
  })

  test('O registro deve ter sido removido do banco', () => {
    return app.db('transfers').where({ id: -1 })
      .then((result) => {
        expect((result).toHaveLength(0))
      })
  })

  test('As transações associadas devem ter sido removidas', () => {
    return app.db('Transactions').where({ transfer_id: -1 })
      .then((result) => {
        expect((result).toHaveLength(0))
      })
  })
})

test('Não deve retornar transferência de outro usuário', () => {
  request(app).get(`${MAIN_ROUTE}/-2`)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Este recurso não pertence ao usuário')
    })
})
