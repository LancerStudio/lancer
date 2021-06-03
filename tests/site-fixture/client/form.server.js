
export default ({ req, locals }) => {
  if (req.method === 'POST') {
    locals.fooField = req.body.foo
  }
}
