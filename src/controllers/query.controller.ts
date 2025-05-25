import { glueService } from '../services/aws/glue.service'
import { athenaService } from '../services/aws/athena.service'

export class QueryController {
  async listDatabases() {
    return await glueService.listDatabases()
  }

  async listTables(databaseName: string) {
    return await glueService.listTables(databaseName)
  }

  async runQuery(query: string) {
    return await athenaService.executeQuery(query)
  }

  async getSessionData(sessionId: string, limit: number = 0) {
    const query = `SELECT * FROM "silver"."ems_liveparam" WHERE session_id = '${sessionId}' LIMIT ${limit};`
    return await athenaService.executeQuery(query)
  }

  async getAllSessionIds() {
    const query = `SELECT session_id FROM "raw"."vehicleinformation" ORDER BY load_ts desc `
    return await athenaService.executeQuery(query)
  }

  async getVehicleInformation(session_id : string) {
    const query = `SELECT * FROM "raw"."vehicleinformation" WHERE session_id = '${session_id}' ORDER BY load_ts desc LIMIT 1000`
    
    return await athenaService.executeQuery(query)
  }

  async getScreenNavigationData(sessionId: string, limit: number = 1000, offset: number = 0) {
    const query = `SELECT * FROM "raw"."screennavigation" WHERE session_id = '${sessionId}' LIMIT ${limit} ;`
    return await athenaService.executeQuery(query)
  }

  async getSessionEmsDtcData(sessionId: string, limit: number = 1000, offset: number = 0) {
    const query = `SELECT * FROM "silver"."emsdtc" WHERE session_id = '${sessionId}' LIMIT ${limit} ;`
    return await athenaService.executeQuery(query)
  }

  async getEventLoggingData(sessionId: string, limit: number = 1000, offset: number = 0) {
    const query = `SELECT * FROM "raw"."eventlogging" WHERE session_id = '${sessionId}' ORDER BY tx_timestamp ASC LIMIT 1000 ;`
    console.log(`Executing query for session_id: ${sessionId}, limit: ${limit}, offset: ${offset}`);
    return await athenaService.executeQuery(query)
  }
}

export const queryController = new QueryController() 