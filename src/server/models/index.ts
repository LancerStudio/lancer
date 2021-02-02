import path from 'path'
import { dataDir } from '../config'
import { connect } from "../lib/db"
import { TranslationModel } from './translation'

const db = connect(path.join(dataDir, 'site.db'))

export const Translation = new TranslationModel(db)
