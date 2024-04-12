import {useNonce} from '@shopify/hydrogen';
import {
  defer,
  type SerializeFrom,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  LiveReload,
  useMatches,
  useRouteError,
  useLoaderData,
  ScrollRestoration,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
} from '@remix-run/react';
import favicon from './assets/favicon.svg';
import resetStyles from './styles/reset.css';
import appStyles from './styles/app.css';
import {Layout} from '~/components/Layout';
import {LocationSelector} from '~/components/LocationSelector';
import {CUSTOMER_LOCATIONS_QUERY} from '~/graphql/customer-account/CustomerLocationsQuery';
import type {Company, CompanyAddress, CompanyLocation, InputMaybe, Maybe} from '@shopify/hydrogen/customer-account-api-types';

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') {
    return true;
  }

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) {
    return true;
  }

  return false;
};

export function links() {
  return [
    {rel: 'stylesheet', href: resetStyles},
    {rel: 'stylesheet', href: appStyles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export type CustomerCompanyLocation = Pick<CompanyLocation, "name" | "id"> & {
  shippingAddress?: Maybe<Pick<CompanyAddress, "countryCode" | "formattedAddress">> | undefined;
};

export type CustomerCompanyLocationConnection = {
  node: CustomerCompanyLocation;
};

export type CustomerCompany = Maybe<Pick<Company, "name" | "id"> & {
  locations: {
      edges: CustomerCompanyLocationConnection[];
  };
}> | undefined;

/**
 * Access the result of the root loader from a React component.
 */
export const useRootLoaderData = () => {
  const [root] = useMatches();
  return root?.data as SerializeFrom<typeof loader>;
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, customerAccount, cart} = context;
  const publicStoreDomain = context.env.PUBLIC_STORE_DOMAIN;

  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  const isLoggedIn = await customerAccount.isLoggedIn();
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/
  const cartPromise = cart.get();

  // defer the footer query (below the fold)
  const footerPromise = storefront.query(FOOTER_QUERY, {
    cache: storefront.CacheLong(),
    variables: {
      footerMenuHandle: 'footer', // Adjust to your footer menu handle
    },
  });

  // await the header query (above the fold)
  const headerPromise = storefront.query(HEADER_QUERY, {
    cache: storefront.CacheLong(),
    variables: {
      headerMenuHandle: 'main-menu', // Adjust to your header menu handle
    },
  });

  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  // B2B buyer context
  let companyLocationId: InputMaybe<string> | undefined;
  let company: CustomerCompany;

  if (isLoggedIn) {
    companyLocationId = (await customerAccount.UNSTABLE_getBuyer())
      ?.companyLocationId;

    const customer = await customerAccount.query(CUSTOMER_LOCATIONS_QUERY);
    company =
      customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company || null;
  }

  if (!companyLocationId && company?.locations?.edges?.length === 1) {
    companyLocationId = company.locations.edges[0].node.id;

    customerAccount.UNSTABLE_setBuyer({
      companyLocationId,
    });
  }

  const showLocationSelector = Boolean(company && !companyLocationId);
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/

  return defer(
    {
      cart: cartPromise,
      footer: footerPromise,
      header: await headerPromise,
      /***********************************************/
      /**********  EXAMPLE UPDATE STARTS  ************/
      isLoggedIn,
      publicStoreDomain,
      company,
      companyLocationId,
      showLocationSelector,
      /**********   EXAMPLE UPDATE END   ************/
      /***********************************************/
    },
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {
          /***********************************************/
          /**********  EXAMPLE UPDATE STARTS  ************/
          data.showLocationSelector ? (
            <main>
              <LocationSelector company={data.company} />
            </main>
          ) : (
            <Layout {...data}>
              <Outlet />
            </Layout>
          )
          /**********   EXAMPLE UPDATE END   ************/
          /***********************************************/
        }
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const rootData = useRootLoaderData();
  const nonce = useNonce();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout {...rootData}>
          <div className="route-error">
            <h1>Oops</h1>
            <h2>{errorStatus}</h2>
            {errorMessage && (
              <fieldset>
                <pre>{errorMessage}</pre>
              </fieldset>
            )}
          </div>
        </Layout>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
` as const;

const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;

const FOOTER_QUERY = `#graphql
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;