import {first} from 'lodash'
import {getAdminSDK} from '../lib/api'
import {getPPPDiscountPercent} from './parity-coupon'
import {getBulkDiscountPercent} from './bulk-coupon'
import {getCalculatedPriced} from './get-calculated-price'

type FormatPricesForProductOptions = {
  productId: string
  country?: string
  quantity?: number
  code?: string
  couponId?: string
}

type FormattedPrice = {
  id: string
  quantity: number
  unitPrice: number
  calculatedPrice: number
  availableCoupons: any[]
  appliedCoupon?: any
}

/**
 *
 * @param productId
 * @param country
 * @param quantity
 * @param code
 * @param couponId
 */
export async function formatPricesForProduct({
  productId,
  country = 'US',
  quantity = 1,
  code,
  couponId,
}: FormatPricesForProductOptions) {
  const {getProduct, getCouponForCode, getMerchantCoupon} = getAdminSDK()

  if (quantity > 101) {
    throw new Error(
      'Please contact support and we will help you with your team order ASAP!',
    )
  }

  const {products_by_pk: loadedProduct} = await getProduct({id: productId})

  if (!loadedProduct) {
    throw new Error('No product was found')
  }

  const {prices, ...noPricesProduct} = loadedProduct
  const firstPrice = first(prices)

  if (!firstPrice) {
    throw new Error(`No valid price found for product [${productId}]`)
  }

  const pppDiscountPercent = getPPPDiscountPercent(country)
  const bulkCouponPercent = getBulkDiscountPercent(quantity)

  // if there's a coupon implied because an id is passed in, load it to verify
  const {merchant_coupons_by_pk: appliedCoupon} = couponId
    ? await getMerchantCoupon({
        id: couponId,
      })
    : {merchant_coupons_by_pk: undefined}

  const pppApplied =
    quantity === 1 && appliedCoupon?.type === 'ppp' && pppDiscountPercent > 0

  // pick the bigger discount during a sale
  const appliedCouponLessThanPPP = appliedCoupon
    ? appliedCoupon.percentage_discount < pppDiscountPercent
    : true
  const appliedCouponLessThanBulk = appliedCoupon
    ? appliedCoupon.percentage_discount < bulkCouponPercent
    : true

  const pppAvailable =
    quantity === 1 && pppDiscountPercent > 0 && appliedCouponLessThanPPP
  const bulkDiscountAvailable =
    bulkCouponPercent > 0 && appliedCouponLessThanBulk && !pppApplied

  let defaultPriceProduct: FormattedPrice = {
    ...noPricesProduct,
    quantity,
    unitPrice: firstPrice.unit_amount,
    calculatedPrice: firstPrice.unit_amount * quantity,
    availableCoupons: [],
  }

  if (appliedCoupon?.type === 'site') {
    defaultPriceProduct = {
      ...defaultPriceProduct,
      calculatedPrice: getCalculatedPriced({
        unitPrice: defaultPriceProduct.unitPrice,
        percentOfDiscount: appliedCoupon.percentage_discount,
        quantity,
      }),
      appliedCoupon,
    }
  }

  // no ppp or bulk if you're applying a code
  if (code) {
    const {coupons} = await getCouponForCode({code})
    const coupon = first(coupons)

    if (!coupon) throw new Error(`No coupon found for code [${code}`)

    if (coupon) {
      if (coupon.restricted_to_product_id !== productId) {
        throw new Error('Invalid coupon.')
      }

      const calculatedPrice = getCalculatedPriced({
        unitPrice: defaultPriceProduct.unitPrice,
        percentOfDiscount: coupon.percentage_discount,
      })

      return {
        ...defaultPriceProduct,
        calculatedPrice,
        appliedCoupon: coupon,
      }
    }
  } else if (pppApplied) {
    const invalidCoupon =
      pppDiscountPercent !== appliedCoupon.percentage_discount

    if (invalidCoupon || appliedCoupon.type !== 'ppp')
      throw new Error('Invalid coupon')

    const {identifier, ...merchantCouponWithoutIdentifier} = appliedCoupon

    return {
      ...defaultPriceProduct,
      calculatedPrice: getCalculatedPriced({
        unitPrice: defaultPriceProduct.unitPrice,
        percentOfDiscount: appliedCoupon.percentage_discount,
      }),
      appliedCoupon: merchantCouponWithoutIdentifier,
    }
  } else if (pppAvailable) {
    // no PPP for bulk
    const pppCoupons = await couponForType('ppp', pppDiscountPercent)

    return {
      ...defaultPriceProduct,
      availableCoupons: pppCoupons,
    }
  } else if (bulkDiscountAvailable) {
    const bulkCoupons = await couponForType('bulk', bulkCouponPercent)
    const bulkCoupon = bulkCoupons[0]

    return {
      ...defaultPriceProduct,
      calculatedPrice: getCalculatedPriced({
        unitPrice: defaultPriceProduct.unitPrice,
        percentOfDiscount: bulkCoupon.percentage_discount,
        quantity,
      }),
      ...(bulkCoupon && {appliedCoupon: bulkCoupon}),
    }
  }

  return defaultPriceProduct
}

async function couponForType(type: string, percentage_discount: number) {
  const {getCouponsForTypeAndDiscount} = getAdminSDK()
  const {merchant_coupons} = await getCouponsForTypeAndDiscount({
    type,
    percentage_discount,
  })

  return merchant_coupons.map((coupon) => {
    // for pricing we don't need the identifier so strip it here
    const {identifier, ...rest} = coupon
    return rest
  })
}