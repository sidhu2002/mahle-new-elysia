import { Elysia, t } from 'elysia'
import { queryController } from '../controllers/query.controller'

// Define types for our data
type AthenaRow = {
  Data: { VarCharValue: string }[]
}

type SessionDataBody = {
  session_id: string
  limit?: number
}

export const queryRouter = new Elysia({ prefix: '/query' })
  // List all databases
  .get('/databases', async () => {
    try {
      const databases = await queryController.listDatabases()
      return { success: true, data: databases }
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  })

  // List tables in a database
  .get('/tables/:database', async ({ params: { database } }) => {
    try {
      const tables = await queryController.listTables(database)
      return { success: true, data: tables }
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  })

  // // Run a simple query
  // .post('/execute', async ({ body: any}) => {
  //   try {
  //     const result = await queryController.runQuery(body.query as string)
  //     return { success: true, data: result }
  //   } catch (error: any) {
  //     return { 
  //       success: false, 
  //       error: error.message 
  //     }
  //   }
  // }, {
  //   body: t => t.Object({
  //     query: t.String()
  //   })
  // })

  // Get data by session_id
  .post('/session-data', async ({ body }) => {
    try {
      const typedBody = body as SessionDataBody
      const result = await queryController.getSessionData(
        typedBody.session_id,
        typedBody.limit || 1000
      )
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No data found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const rows = result.Rows.slice(1).map((row: AthenaRow) => {
        const rowData: Record<string, string | number | null> = {}
        row.Data?.forEach((col, index) => {
          const header = headers[index]
          if (!header) return

          let value: string | number | null = col.VarCharValue
          if (header.endsWith('time')) {
            value = value ? parseInt(value) : null
          } else if (header === 'method' || header === 'decimal_response_code') {
            value = value ? parseInt(value) : null
          }
          rowData[header] = value
        })
        return rowData
      })

      return { 
        success: true, 
        data: rows,
        metadata: {
          total: rows.length,
          session_id: typedBody.session_id
        }
      }
    } catch (error: any) {
      console.error('Session data error:', error)
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  }, {
    body: t.Object({
      session_id: t.String(),
      limit: t.Optional(t.Number({ default: 1000 }))
    })
  })

  // Get specific session data
  .post('/session-details', async ({ body }) => {
    try {
      const query = `
        SELECT 
          session_id,
          ems_dtc_rx,
          ems_dtc_tx,
          ems_dtc_starttime,
          ems_dtc_endtime,
          ecu_id,
          description,
          category,
          resolved_value
        FROM silver.ems
        WHERE session_id = '${body.session_id}'
        ${body.start_time ? `AND ems_dtc_starttime >= ${body.start_time}` : ''}
        ${body.end_time ? `AND ems_dtc_endtime <= ${body.end_time}` : ''}
        LIMIT ${body.limit || 1000}
      `
      const result = await queryController.runQuery(query)
      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      }
    }
  }, {
    body: t => t.Object({
      session_id: t.String(),
      start_time: t.Optional(t.Number()),
      end_time: t.Optional(t.Number()),
      limit: t.Optional(t.Number())
    })
  })

  // Get all EMS data with pagination
  .post('/all-data', async ({ body }) => {
    try {
      const query = `
        SELECT *
        FROM silver.ems
        LIMIT ${body.limit || 1000}
        OFFSET ${body.offset || 0}
      `
      const result = await queryController.runQuery(query)
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No data found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const rows = result.Rows.slice(1).map(row => {
        const rowData = {}
        row.Data?.forEach((col, index) => {
          rowData[headers[index]] = col.VarCharValue
        })
        return rowData
      })

      return { 
        success: true, 
        data: rows,
        metadata: {
          total: rows.length,
          limit: body.limit || 1000,
          offset: body.offset || 0
        }
      }
    } catch (error) {
      console.error('Query error:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }, {
    body: t.Object({
      limit: t.Optional(t.Number({ default: 1000 })),
      offset: t.Optional(t.Number({ default: 0 }))
    })
  })

  // Get all unique session IDs
  .get('/sessions', async () => {
    try {
     
      const result = await queryController.getAllSessionIds();
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No session IDs found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const sessionIds = result.Rows.slice(1).map((row: AthenaRow) => {
        return row.Data?.[0]?.VarCharValue || ''
      }).filter(id => id !== '')

      return { 
        success: true, 
        data: sessionIds,
        metadata: {
          total: sessionIds.length
        }
      }
    } catch (error: any) {
      console.error('Error fetching session IDs:', error)
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  }, {
    detail: {
      summary: 'Get all unique session IDs',
      tags: ['Query']
    }
  })

  // Get screen navigation data by session_id
  .post('/screen-navigation', async ({ body }) => {
    try {
      const query = `
        SELECT * 
        FROM raw.screennavigation 
        WHERE session_id = '${body.session_id}'
        ORDER BY processed_ts DESC
        LIMIT ${body.limit || 100} 
        OFFSET ${body.offset || 0}
      `
      const result = await queryController.getScreenNavigationData(body.session_id, body.limit || 100, body.offset || 0)
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No screen navigation data found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const rows = result.Rows.slice(1).map((row: AthenaRow) => {
        const rowData: Record<string, string | number | null> = {}
        row.Data?.forEach((col, index) => {
          const header = headers[index]
          if (!header) return

          let value: string | number | null = col.VarCharValue
          // Convert time fields to numbers
          if (header.includes('time') || header === 'processed_ts') {
            value = value ? parseInt(value) : null
          }
          rowData[header] = value
        })
        return rowData
      })

      return { 
        success: true, 
        data: rows,
        metadata: {
          total: rows.length,
          session_id: body.session_id,
          limit: body.limit || 100,
          offset: body.offset || 0
        }
      }
    } catch (error: any) {
      console.error('Screen navigation data error:', error)
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  }, {
    body: t.Object({
      session_id: t.String(),
      limit: t.Optional(t.Number({ default: 100 })),
      offset: t.Optional(t.Number({ default: 0 }))
    }),
    detail: {
      summary: 'Get screen navigation data by session ID',
      tags: ['Query']
    }
  }) 

  .post('/event-logging', async ({ body }) => {
    try {
      const result = await queryController.getEventLoggingData(body.session_id, body.limit || 100, body.offset || 0)
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No event logging data found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const rows = result.Rows.slice(1).map((row: AthenaRow) => {
        const rowData: Record<string, string | number | null> = {}
        row.Data?.forEach((col, index) => {
          const header = headers[index]
          if (!header) return

          // Keep all values as their original string format
          rowData[header] = col.VarCharValue
        })
        return rowData
      })

      return { 
        success: true, 
        data: rows,
        metadata: {
          total: rows.length,
          session_id: body.session_id,
          limit: body.limit || 100,
          offset: body.offset || 0
        }
      }
    } catch (error: any) {
      console.error('Event logging data error:', error)
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  }, {
    body: t.Object({
      session_id: t.String(),
      limit: t.Optional(t.Number({ default: 100 })),
      offset: t.Optional(t.Number({ default: 0 }))
    }),
    detail: {
      summary: 'Get event logging data by session ID',
      tags: ['Query']
    }
  }) 

  .post('/session-emsdtc', async ({ body }) => {
    try {
      const query = `
        SELECT * 
        FROM silver.emsdtc 
        WHERE session_id = '${body.session_id}'
        ORDER BY ems_dtc_starttime DESC
        LIMIT ${body.limit || 100} 
        OFFSET ${body.offset || 0}
      `
      const result = await queryController.getSessionEmsDtcData(body.session_id, body.limit || 100, body.offset || 0)
      
      if (!result?.Rows?.length) {
        return { 
          success: false, 
          error: 'No screen navigation data found' 
        }
      }

      // Transform the Athena result into a more friendly format
      const headers = result.Rows[0].Data?.map(col => col.VarCharValue) || []
      const rows = result.Rows.slice(1).map((row: AthenaRow) => {
        const rowData: Record<string, string | number | null> = {}
        row.Data?.forEach((col, index) => {
          const header = headers[index]
          if (!header) return

          let value: string | number | null = col.VarCharValue
          // Convert time fields to numbers
          if (header.includes('time') || header === 'processed_ts') {
            value = value ? parseInt(value) : null
          }
          rowData[header] = value
        })
        return rowData
      })

      return { 
        success: true, 
        data: rows,
        metadata: {
          total: rows.length,
          session_id: body.session_id,
          limit: body.limit || 100,
          offset: body.offset || 0
        }
      }
    } catch (error: any) {
      console.error('Screen navigation data error:', error)
      return { 
        success: false, 
        error: error?.message || 'Unknown error' 
      }
    }
  }, {
    body: t.Object({
      session_id: t.String(),
      limit: t.Optional(t.Number({ default: 100 })),
      offset: t.Optional(t.Number({ default: 0 }))
    }),
    detail: {
      summary: 'Get screen navigation data by session ID',
      tags: ['Query']
    }
  }) 