import { getCarplsData } from './ccb'

/* eslint-disable no-console */

// To run, need to set CCB_USERNAME and CCB_PASSWORD as env variables

const main = async () => {
  const data = await getCarplsData(263)
  console.log(data)
}

main()
