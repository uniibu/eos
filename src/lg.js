import * as lg from "@devnodes/logger-client"

const logInstance  = async() => {
  const log = await lg.instance("wss://log.nodes.dev","EOS")
  return log
}
export default logInstance;