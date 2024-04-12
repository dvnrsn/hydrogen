import {CartForm} from '@shopify/hydrogen';
import type {
  Company,
  CompanyLocation,
  CompanyLocationConnection,
} from '@shopify/hydrogen-react/customer-account-api-types';

export function LocationSelector({company}: {company: Company}) {
  const locations = company?.locations?.edges
    ? company.locations.edges.map((location: CompanyLocationConnection) => {
        return {...location.node};
      })
    : [];

  function LocationItem({location}: {location: CompanyLocation}) {
    const addressLines = location?.shippingAddress?.formattedAddress ?? [];
    return (
      <label>
        <div style={{display: 'flex', alignItems: 'baseline'}}>
          <input
            type="radio"
            id={location.id}
            name="companyLocationId"
            value={location.id}
            style={{marginRight: '1rem'}}
          />
          <div>
            <strong>{location.name}</strong>
            {addressLines.map((line: string) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </label>
    );
  }

  if (!company) return <h2>Not logged in for B2B</h2>;

  return (
    <div>
      <h1>Logged in for {company.name}</h1>
      <CartForm route="/cart" action={CartForm.ACTIONS.BuyerIdentityUpdate}>
        <fieldset>
          <legend>Choose a location:</legend>
          {locations.map((location: CompanyLocation) => {
            return (
              <div key={location.id}>
                <LocationItem location={location} />
                <br />
                <br />
              </div>
            );
          })}
        </fieldset>
        <button type="submit">Choose Location</button>
      </CartForm>
    </div>
  );
}