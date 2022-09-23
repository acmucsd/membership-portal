import { ResumeModel } from "models/ResumeModel";
import Repositories, { TransactionsManager } from "repositories";
import { NotFoundError } from "routing-controllers";
import { Service } from "typedi";
import { EntityManager } from "typeorm";
import { InjectManager } from "typeorm-typedi-extensions";
import { ResumeRepository } from "../repositories/ResumeRepository";

@Service()
export default class ResumeService {  
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getVisibleResumes() : Promise<ResumeModel[]> {
    const resumes = await this.transactions.readOnly(async (txn) => Repositories
    .resume(txn).findVisible());
    if (!resumes) throw new NotFoundError('Resumes was not found');
    return resumes;
  }
}