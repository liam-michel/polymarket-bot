import { Kysely } from 'kysely';

import * as generated from '~/__generated__/database.js';

export type KyselyDB = Kysely<generated.DB>;
