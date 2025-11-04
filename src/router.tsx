import { Router, Route, RootRoute } from '@tanstack/react-router'
import { MainNav } from '@/components/main-nav'

import App from './App'

// Import your page components
import HomePage from './app/page'
import CustomersPage from './app/customers/page'
import CustomerDetailPage from './app/customers/[id]/page'
import DealsPage from './app/deals/page'
import DealDetailPage from './app/deals/[id]/page'
import TasksPage from './app/tasks/page'
import CalendarPage from './app/calendar/page' // Added CalendarPage import
import LoginPage from './app/login/page'
import ErrorPage from './app/error/page'
import SettingsPage from './app/settings/page'
import SettingsLayout from './app/settings/layout'
import CustomFieldsPage from './app/settings/custom-fields/page'
// Import Product page components
import ProductsPage from './app/products/page';
import ProductsLoading from './app/products/loading'; // Assuming loading component exists

// Create a root route
const rootRoute = new RootRoute({
  component: App,
})

// Create your routes
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
      <HomePage />
  ),
  // This is the default route that will be shown when the app starts
  // No need for redirection as we want to show the dashboard (HomePage)
})

const customersRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/customers',
  component: () => (

      <CustomersPage />

  ),
})

export const customerDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/customers/$customerId',
  component: () => (

      <CustomerDetailPage />

  ),
})

const dealsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/deals',
  component: () => (

      <DealsPage />

  ),
})

const dealDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/deals/$dealId',
  component: () => (

      <DealDetailPage />

  ),
})

const tasksRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: () => (

      <TasksPage />

  ),
})

const calendarRoute = new Route({ // Added calendarRoute
  getParentRoute: () => rootRoute,
  path: '/calendar',
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: () => (

      <CalendarPage />

  ),
})

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const errorRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/error',
  component: ErrorPage,
})


const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsLayout,
})

const settingsIndexRoute = new Route({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: SettingsPage,
  // Add debugging to this route
  beforeLoad: () => {
    console.log('[settingsIndexRoute] Before load triggered')
    return {}
  },
  onError: (error) => {
    console.error('[settingsIndexRoute] Error loading route:', error)
  },
})

const customFieldsRoute = new Route({
  getParentRoute: () => settingsRoute,
  path: '/custom-fields',
  component: CustomFieldsPage,
  // Add debugging to this route
  beforeLoad: () => {
    console.log('[customFieldsRoute] Before load triggered')
    return {}
  },
  onError: (error) => {
    console.error('[customFieldsRoute] Error loading route:', error)
  },
})

// Added products route
const productsRoute = new Route({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: ProductsPage,
    pendingComponent: ProductsLoading, // Optional: Show loading component during fetch
});

// Create a catch-all route to handle any undefined routes
const catchAllRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: ({ navigate }) => {
    // Redirect to the dashboard for any undefined routes
    navigate({ to: '/' })
    return { status: 302 }
  },
  component: () => null
})

// Create the route tree using your routes
const routeTree = rootRoute.addChildren([
  indexRoute,
  customersRoute,
  customerDetailRoute,
  dealsRoute,
  dealDetailRoute,
  tasksRoute,
  calendarRoute, // Added calendarRoute to tree
  loginRoute,
  errorRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    customFieldsRoute,
  ]),
  productsRoute, // Added products route to tree
  catchAllRoute, // Add the catch-all route
])

// Create the router using your route tree
export const router = new Router({ 
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0, // Always preload routes
})

// Register your router for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
