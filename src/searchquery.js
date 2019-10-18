
export const getQuery = `
  subscription($query: String!, $cursor: String!, $lowBlockNum: Int64!, $highBlockNum: Int64!) {
     searchTransactionsForward(
       query: $query, 
       irreversibleOnly: true, 
       liveMarkerInterval: 10, 
       lowBlockNum:$lowBlockNum
       highBlockNum:$highBlockNum
       cursor:$cursor) {
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