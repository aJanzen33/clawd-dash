// Measures the dashboard's own row: the width it is laid out in, which is the
// window's, while `e.viewport.columns` shrinks to the transcript's beside a
// docked pane. Draws nothing; posts the width once per change.
import type { ClientModule } from 'claude-code'

const WidthProbe: ClientModule<null, number> = (_props, surface) => {
  if (surface.columns > 0 && surface.columns !== surface.state) {
    surface.setState(surface.columns)
    surface.post({ columns: surface.columns })
  }
  const { Box } = surface.elements
  return <Box />
}

export default WidthProbe
