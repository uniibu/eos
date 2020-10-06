
export const getQuery = `
subscription ($query: String!, $cursor: String!, $lowBlockNum: Int64!) {
  searchTransactionsForward(query: $query, irreversibleOnly: true, liveMarkerInterval: 10, lowBlockNum: $lowBlockNum, cursor: $cursor) {
    cursor
    block {
      id
      num
    }
    isIrreversible
    undo
    trace {
      id
      status
      matchingActions {
        account
        name
        receiver
        json
      }
    }
  }
}
`;

export const txQuery = `
query ($query: String!, $limit: Int64!, $highBlockNum: Int64!, $lowBlockNum: Int64!) {
  searchTransactionsForward(query: $query,  irreversibleOnly: true,  highBlockNum: $highBlockNum, lowBlockNum:$lowBlockNum, limit: $limit) {
    results {
      undo
      cursor
      trace {
        id
        matchingActions {
          receiver
          json
        }
      }
    }
  }
}
`