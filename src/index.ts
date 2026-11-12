import AppRoot from "./app/AppRoot"
import { installBehavior } from "./app/behavior"
import { inflator } from "./essential"


const inflated = inflator.inflateComponent(AppRoot)
const rootElement = document.getElementById("root")!
rootElement.replaceChildren(inflated)

installBehavior()
