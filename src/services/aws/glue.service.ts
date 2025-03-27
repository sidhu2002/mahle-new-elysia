import { GlueClient, GetTablesCommand, GetDatabasesCommand } from '@aws-sdk/client-glue'
import { AWS_CONFIG } from '../../config/aws.config'

class GlueService {
  private glueClient: GlueClient

  constructor() {
    this.glueClient = new GlueClient(AWS_CONFIG)
  }

  async listDatabases() {
    try {
      const command = new GetDatabasesCommand({})
      const response = await this.glueClient.send(command)
      return response.DatabaseList
    } catch (error) {
      console.error('Error listing databases:', error)
      throw error
    }
  }

  async listTables(databaseName: string) {
    try {
      const command = new GetTablesCommand({
        DatabaseName: databaseName
      })
      const response = await this.glueClient.send(command)
      return response.TableList
    } catch (error) {
      console.error('Error listing tables:', error)
      throw error
    }
  }
}

export const glueService = new GlueService() 