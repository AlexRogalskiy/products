import {mockDeep, DeepMockProxy} from 'jest-mock-extended'
import prisma, {PrismaClient} from '../db'

export const defaultContext: Context = {prisma}

export type Context = {
  prisma: PrismaClient
}

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>
}

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  }
}
