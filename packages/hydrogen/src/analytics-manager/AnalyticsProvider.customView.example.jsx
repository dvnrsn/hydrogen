import {Unstable__Analytics} from '@shopify/hydrogen';

export default function Promotion() {
  return (
    <div className="promotion">
      <h1>Promotion page</h1>
      <Unstable__Analytics.CustomView
        type="custom_promotion_viewed"
        data={{
          promotion: {
            id: '123',
          },
        }}
      />
    </div>
  );
}
