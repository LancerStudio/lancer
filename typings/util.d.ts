
type POJO<T=string> = Record<string, T>

type UnPromisify<T> = T extends Promise<infer U> ? U : T;
type UnPromisifiedObject<T> = { [k in keyof T]: UnPromisify<T[k]> }

type ReturnTypeObject<T extends Record<any,(...args: any[]) => any>> = { [k in keyof T]: ReturnType<T[k]> }
type ParamsTypeObject<T extends Record<any,(params: any) => any>> = { [k in keyof T]: Parameters<T[k]>[0] }

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type ItemType<T> = T extends Array<infer U> ? U : never

type Assign<T1, T2> = Omit<T1, keyof T2> & T2

/** Collapses a type */
type _<T> = T extends infer O ? { [K in keyof O]: O[K] } : never
