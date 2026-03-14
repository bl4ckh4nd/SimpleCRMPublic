import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'

import App from './App'
import HomePage from './app/page'
import CustomersPage from './app/customers/page'
import CustomerDetailPage from './app/customers/[id]/page'
import DealsPage from './app/deals/page'
import DealDetailPage from './app/deals/[id]/page'
import TasksPage from './app/tasks/page'
import CalendarPage from './app/calendar/page'
import LoginPage from './app/login/page'
import ErrorPage from './app/error/page'
import SettingsPage from './app/settings/page'
import SettingsLayout from './app/settings/layout'
import CustomFieldsPage from './app/settings/custom-fields/page'
import ProductsPage from './app/products/page'
import ProductsLoading from './app/products/loading'
import FollowUpPage from './app/followup/page'

const rootRoute = createRootRoute({ component: App })

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const customersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers', component: CustomersPage })
export const customerDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers/$customerId', component: CustomerDetailPage })
const dealsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/deals', component: DealsPage })
const dealDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/deals/$dealId', component: DealDetailPage })
const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: TasksPage })
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: CalendarPage,
})
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage })
const errorRoute = createRoute({ getParentRoute: () => rootRoute, path: '/error', component: ErrorPage })

const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsLayout })
const settingsIndexRoute = createRoute({ getParentRoute: () => settingsRoute, path: '/', component: SettingsPage })
const customFieldsRoute = createRoute({ getParentRoute: () => settingsRoute, path: '/custom-fields', component: CustomFieldsPage })

const productsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/products', component: ProductsPage, pendingComponent: ProductsLoading })
const followUpRoute = createRoute({ getParentRoute: () => rootRoute, path: '/followup', component: FollowUpPage })

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => { throw redirect({ to: '/' }) },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  customersRoute,
  customerDetailRoute,
  dealsRoute,
  dealDetailRoute,
  tasksRoute,
  calendarRoute,
  loginRoute,
  errorRoute,
  settingsRoute.addChildren([settingsIndexRoute, customFieldsRoute]),
  productsRoute,
  followUpRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
