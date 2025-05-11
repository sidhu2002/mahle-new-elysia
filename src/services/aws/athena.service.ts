import { 
  AthenaClient, 
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand 
} from '@aws-sdk/client-athena'
import { AWS_CONFIG } from '../../config/aws.config'

class AthenaService {
  private athenaClient: AthenaClient

  constructor() {
    this.athenaClient = new AthenaClient(AWS_CONFIG)
  }

  async executeQuery(query: string) {
    try {
      // Start query execution
      console.log("starting",query)
      const startQueryCommand = new StartQueryExecutionCommand({
        QueryString: query,
        ResultConfiguration: {
          OutputLocation: AWS_CONFIG.athena.outputLocation,
        },
        WorkGroup: AWS_CONFIG.athena.workGroup
      })

      const { QueryExecutionId } = await this.athenaClient.send(startQueryCommand)
      if (!QueryExecutionId) throw new Error('Failed to get QueryExecutionId')

      // Wait for query to complete
      let queryStatus = 'RUNNING'
      while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const queryExecution = await this.athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId })
        )
        queryStatus = queryExecution.QueryExecution?.Status?.State || 'FAILED'
      }

      if (queryStatus === 'FAILED') {
        throw new Error('Query execution failed')
      }

      // Get results
      const results = await this.athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId })
      )
      console.log(results)

      return results.ResultSet
    } catch (error) {
      console.error('Error executing Athena query:', error)
      throw error
    }
  }
}

export const athenaService = new AthenaService() 