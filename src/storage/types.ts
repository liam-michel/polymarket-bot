import * as generated from '~/__generated__/database.js';
import { Kysely } from 'kysely';

export type KyselyDB = Kysely<generated.DB>;
